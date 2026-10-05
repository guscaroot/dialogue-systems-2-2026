export type bird = {
    id: number,
    speciesname: string,
    scientificname: string,
    location: string[],
    habitat: string[],
    size: 'XS' | 'S' | 'M' | 'L',
    status: 'Critically Endangered' | 'Endangered' | 'Vulnerable' |
            'Near Threatened' | 'Conservation Dependent' | 'Least Concern',
    description: string,
};


const eurasianBlueTit: bird = {
    id: 1,
    speciesname: "eurasian blue tit",
    scientificname: "cyanistes caeruleus",
    location: [
        "sweden",
        "Temperate and subarctic Europe",
        "Western Asia",
        "Middle East"
    ],
    habitat: [
        "Deciduous woodland",
        "Parks",
        "Gardens",
        "Town centres"
    ],
    size: "XS",
    status: 'Least Concern',
    description: "Usually 10.5–12 cm long, with a wingspan of 17.5–20 cm and a weight of about 11 g. The male has an intensely blue crown, a dark blue line through the eye and around the white cheeks and chin, a white forehead and wing bar, blue nape, wings and tail, and a yellowish-green back. The underparts are mostly sulphur-yellow with a dark line down the abdomen. It has a black bill, bluish-grey legs and dark-brown irises. The male's crown is a brighter, more intense blue than that of the female or chick, particularly under ultraviolet light."
}


const houseSparrow:  bird = {
    id: 2,
    speciesname: "House sparrow",
    scientificname: "Passer domesticus",
    location: [
        "Most of Europe",
        "Mediterranean Basin",
        "Large part of Asia",
        "Parts of Australasia",
        "Parts of Africa",
        "Parts of the Americas"
    ],
    habitat: [
        "Urban settings",
        "Rural settings",
        "Human habitation"
    ],
    status: "Least Concern",
    size: "XS",
    description: "Typically about 16 cm long, ranging from 14 to 18 cm, with a wingspan of 19–25 cm and a mass of 24–39.5 g. The house sparrow is a compact bird with a full chest and a large, rounded head. Its bill is stout and conical, and its tail is short. The male has boldly coloured head markings, a reddish-brown back and grey underparts. Its crown is dark grey, with chestnut brown on the sides of the head. It has black around the bill, on the throat and between the bill and eyes, with a small white stripe between the lores and crown and small white spots behind the eyes. The cheeks and underparts are pale grey or white. The upper back and mantle are warm brown with broad black streaks, while the lower back, rump and upper tail coverts are greyish brown. In fresh nonbreeding plumage, the male is duller, with whitish feather tips. The black throat and chest patch, called the bib or badge, becomes more exposed with wear and preening. The male's bill is dark grey, becoming black in the breeding season."
}

const greyHeron: bird = {
    id: 3,
    speciesname: "Grey heron",
    scientificname: "Ardea cinerea",
    location: [
        "Europe",
        "Asia",
        "Africa",
        "Madagascar",
        "Eastern Siberia",
        "Mongolia",
        "Eastern China",
        "Hainan",
        "Japan",
        "Taiwan",
        "Mauritania",
        "Canary Islands",
        "Mediterranean Islands"
    ],
    habitat: [
        "Lakes",
        "Rivers",
        "Ponds",
        "Marshes",
        "Reservoirs",
        "Ditches",
        "Flooded areas",
        "Coastal lagoons",
        "Estuaries",
        "Sea shore",
        "Pasture",
        "Mountain tarns"
    ],
    status: "Least Concern",
    size: "L",
    description: "A large, long-legged wading bird standing up to 100 cm tall and measuring 84–102 cm long, with a wingspan of 155–195 cm and a body weight of 1.02–2.08 kg. Its plumage is largely ashy-grey above and greyish-white below, with some black on the flanks. Adults have a white head and neck with a broad black stripe extending from the eye to a slender, dangling crest, and bluish-black streaks on the front of the neck. The scapular feathers and feathers at the base of the neck are somewhat elongated. Its beak is long, straight and powerful, pinkish-yellow and brighter in breeding adults. The iris is yellow and the legs are brown and very long. Immature birds have a grey head stripe, a paler grey face, a smaller dark grey crest and are generally duller in appearance."
};

export const birdsDB: bird[] = [eurasianBlueTit, houseSparrow, greyHeron]
