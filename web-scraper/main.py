import bs4
import requests
import re
from pathlib import Path
import json
from urllib.parse import urlsplit
from tqdm import tqdm


BIRDLIFE_API_URL = "https://bli-prod-fd-dz-eu-bgf5eqfcf2bmgtdn.a02.azurefd.net"


def clean_references(text):
    """ Remove source references from text (like [3]) """
    return re.sub(r"\[\s?\d+\s?\]", "", text)


def normalize_text(text):
    """ Collapse whitespace and strip references """
    if not text:
        return ""
    text = clean_references(text)
    return re.sub(r"\s+", " ", text).strip()

def get_common_name(soup: bs4.BeautifulSoup) -> str:
    """ Extract the bird common name """
    title_tag = soup.find("h1")
    if title_tag:
        return title_tag.get_text(strip=True)


def get_conservation_status(soup: bs4.BeautifulSoup) -> str:
    """ Extract the conservation status """
    tables = soup.select("table.infobox")
    for table in tables:
        found_status = False
        for row in table.select("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
            row_text = " ".join(cells)
            if row_text.lower() == "conservation status":
                found_status = True
                continue
            if found_status:
                conservation_status = row_text.split("(")[0].strip().lower()
                return conservation_status


def get_scientific_name(soup: bs4.BeautifulSoup) -> str:
    """ Extract the scientific name """
    def clean(row_text):
        if "(" in row_text:
            return row_text.split("(")[0].replace("Linnaeus", "").strip()
        elif "," in row_text:
            elements = row_text.split(",")
            words = elements[0].split(" ")
            return " ".join(words[:-2]).strip()
        else:
            return row_text.strip()

    tables = soup.select("table.infobox")
    for table in tables:
        found_name = False
        for row in table.select("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
            row_text = " ".join(cells)

            if row_text.lower() == "binomial name":
                found_name = True
                continue
            if found_name:
                return clean(row_text)

    raise ValueError("Scientific name not found")


def get_description(soup: bs4.BeautifulSoup) -> str:
    """Extract the description section from the article."""
    heading = soup.find(id="Description")
    if heading:
        container = heading.find_parent(["h2", "h3", "div"], class_=lambda c: c is None or "mw-heading" in c) or heading
        paragraphs = []
        for sibling in container.find_next_siblings():
            if sibling.name in ("h2", "h3") or (
                sibling.name == "div" and "mw-heading" in (sibling.get("class") or [])
            ):
                break
            if sibling.name == "p":
                paragraph = normalize_text(sibling.get_text(" ", strip=True))
                paragraphs.append(clean_references(paragraph)) #FIXME: is this needed?
        return "\n".join(paragraphs)

    raise ValueError("No description found")


def get_habitats(species_id: int) -> list[str]:
    """ Extract habitat from Birdlife API 
    
    The habitat is simplified from the level 1 and 2 habitat of the IUCN classification """

    def map_iucn_to_habitatCat(habitat1:str, habitat2:str) -> str:
        with open("habitat_mapping.json", "r") as f:
            mapping = json.load(f)

        if habitat1 not in mapping:
            raise KeyError(f"could not find level 1 '{habitat1}'")
        if isinstance(mapping[habitat1], str):
            return mapping[habitat1]
        elif isinstance(mapping[habitat1], dict):
            if habitat2 not in mapping[habitat1]:
                raise KeyError(f"could not find level 2 '{habitat2}' in '{habitat1}'")
            return mapping[habitat1][habitat2]
        else:
            raise ValueError()

    api_url = f"{BIRDLIFE_API_URL}/species/{str(species_id)}/habitats"
    data = get_response_json(api_url)
    habitats_L1 = [item["habitatL1Description"] for item in data]
    habitats_L2 = [item["habitatL2Description"] for item in data]
    habitats = []
    
    for habitat1, habitat2 in zip(habitats_L1, habitats_L2):
        #print(f"habitat2: '{habitat2}'")
        if "-" in habitat2:
            habitat2 = habitat2.split("-")[1].strip()
        habitat = map_iucn_to_habitatCat(habitat1, habitat2)
        if not habitat == "REMOVE":
            habitats.append(habitat)

    return list(set(habitats))

    
def get_countries(species_id: int):
    """ Extract country and region of bird distribution if not vagrant """
    api_url = f"{BIRDLIFE_API_URL}/species/{str(species_id)}/countries"
    data = get_response_json(api_url)
    countries = []
    regions = []
    for item in data:
        if not item["occurenceStatus"] == "vagrant":
            countries.append(item["country"]["birdLifeName"])
            if item["country"]["region"]:
                regions.append(item["country"]["region"])

    return list(set(countries)), list(set(regions))


def get_species_id(soup: bs4.BeautifulSoup) -> int:
    """ Extract the species ID used by BirdLife to identify a species
    
    This identification number is used to query the BirdLife API to find habitats andlocation"""
    script = soup.find("script", string=lambda text: text and "speciesId" in text)
    match = re.search(r'\\"speciesId\\":(\d+),', script.string)

    return int(match.group(1))


class Bird:

    def __init__(self, species_id, common_name, scientific_name, conservation_status, description, habitats, countries, regions):
        self.species_id: int = species_id
        self.common_name: str = common_name
        self.scientific_name: str = scientific_name
        self.conservation_status: str = conservation_status
        self.description: str = description
        self.habitats: list = habitats
        self.countries: list = countries
        self.regions: list = regions

    def __str__(self) -> str:
        return (
            "********************************************"
            f"Common name: {self.common_name}\n"
            f"Scientific name: {self.scientific_name}\n"
            f"Conservation status: {self.conservation_status}\n"
            f"Description: {self.description}\n"
        )

    def serialize(self) -> dict:
        """ Transform a Bird object into an object that can be written to JSON later """
        return {
            "species_id": self.species_id,
            "common_name": self.common_name,
            "scientific_name": self.scientific_name,
            "conservation_status": self.conservation_status,
            "description": self.description,
            "habitats": self.habitats,
            "countries": self.countries,
            "regions": self.regions
        }


def get_response_json(url: str):
    """ Send GET request and returns JSON object """
    print(f"Sending GET request to '{url}'")
    response = requests.get(url)
    response.raise_for_status()
    
    return response.json()


def get_response_soup(url: str) -> bs4.BeautifulSoup:
    """ Send get request and return BeautifulSoup object"""
    print(f"Sending GET request to '{url}'")
    response = requests.get(url, headers={"User-Agent": "CoolBot/0.0"})
    response.raise_for_status()

    return bs4.BeautifulSoup(response.text, "html.parser")


def main():

    with open("reference-urls.json", "r", encoding="utf-8") as f:
        reference_urls = json.load(f)

    birds = []
    regions = []
    habitats = []
    countries = []
    for item in tqdm(reference_urls, desc="Extracting data from Wikipedia/Birdlife"):
        wiki_url = item.get("wikipedia")
        wiki_soup = get_response_soup(wiki_url)

        birdlife_url = item.get("birdlife")
        birdlife_soup = get_response_soup(birdlife_url)

        species_id = get_species_id(birdlife_soup)
        countries, regions = get_countries(species_id)
        habitats = get_habitats(species_id)
        common_name = get_common_name(wiki_soup)
        scientific_name = get_scientific_name(wiki_soup)
        conservation_status = get_conservation_status(wiki_soup)
        description = get_description(wiki_soup)

        bird = Bird(species_id, common_name, scientific_name, conservation_status, description, habitats, countries, regions)
        birds.append(bird)
        regions.extend(bird.regions)
        habitats.extend(bird.habitats)
        countries.extend(bird.countries)

    with open("../sisu/birds.json", "w", encoding="utf-8") as f:
        data = [bird.serialize() for bird in birds]
        json.dump(data, f, ensure_ascii=False, indent=4)

    with open("regions.txt", "w", encoding="utf-8") as f:
        f.write("export type distributionCat =\n")
        for region in list(set(regions)):
            f.write(f"  | \"{region.lower()}\"\n")
    
    with open("countries.txt", "w", encoding="utf-8") as f:
        f.write("export type distributionCat =\n")
        for country in list(set(countries)):
            f.write(f"  | \"{country.lower()}\"\n")

    with open("habitats.txt", "w", encoding="utf-8") as f:
        f.write("export type habitatCat =\n")
        for habitat in list(set(habitats)):
            f.write(f"  | \"{habitat.lower()}\"\n")
    

if __name__ == "__main__":
    main()