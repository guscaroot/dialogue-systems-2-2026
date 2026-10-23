import { bird } from "./types"
import { v4 as uuidv4 } from "uuid";


export const eurasianBlueTit: bird = {
  id: uuidv4(),
  commonName: "eurasian blue tit",
  scientificName: "cyanistes caeruleus",
  distribution: [
    "northern europe",
    "non-northern europe",
    "middle-east and western asia",
  ],
  habitat: [
    "forest",
    "urban and suburban"
  ],
  size: "XS",
  conservationStatus: 'least concern',
  description: "Usually 10.5–12 cm long, with a wingspan of 17.5–20 cm and a weight of about 11 g. The male has an intensely blue crown, a dark blue line through the eye and around the white cheeks and chin, a white forehead and wing bar, blue nape, wings and tail, and a yellowish-green back. The underparts are mostly sulphur-yellow with a dark line down the abdomen. It has a black bill, bluish-grey legs and dark-brown irises. The male's crown is a brighter, more intense blue than that of the female or chick, particularly under ultraviolet light."
}

const greatTit: bird = {
  id: uuidv4(),
  commonName: "great tit",
  scientificName: "Parus major",
  distribution: [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia"
  ],
  habitat: [
    "forest",
    "urban and suburban",
    "shrubland"
  ],
  conservationStatus: "least concern",
  size: "XS",
  description: "Usually 12.5–14 cm long. The male has a bluish-black crown, black neck, throat, bib and head, with prominent white cheeks and ear coverts. The breast is bright lemon-yellow, with a broad black stripe running down the middle from the bib to the vent. There is a dull white spot on the neck that turns greenish-yellow on the upper nape. The rest of the nape and back are green tinged with olive. The wing-coverts are green, while the rest of the wing is bluish-grey with a white wing-bar. The tail is bluish-grey with white outer tips. The male's plumage is typically bright, although coloration varies among subspecies."
}

const coalTit = {
  "id": uuidv4(),
  "commonName": "coal tit",
  "scientificName": "periparus ater",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia",
    "southeast asia"
  ],
  "habitat": [
    "forest",
    "urban and suburban"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "The coal tit is 10–11.5 cm in length. The adult male Coal tit has a black crown, forehead, nape and chin, with a distinctive white patch on the nape and large white cheek patches. Its upperparts are bluish-grey, and its wings are dark with two conspicuous white wing bars. The tail is dark grey. The underparts are whitish to pale buff, with the flanks sometimes showing a buff tint. The bill is short, slender and black. The eyes are dark brown, and the legs and feet are bluish-grey."
}

const eurasianNuthatch: bird = {
  "id": uuidv4(),
  "commonName": "eurasian nuthatch",
  "scientificName": "sitta europaea",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia"
  ],
  "habitat": [
    "forest",
    "urban and suburban"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "The eurasian nuthatch is approximately 14 cm long. It has blue-grey upperparts extending from the forehead over the back and wings to the short tail. a distinctive black stripe runs through the eye from the base of the bill towards the back of the head. the cheeks and throat are whitish, contrasting with the blue-grey crown and upperparts. the underparts are pale buff to creamy-white, becoming rusty chestnut on the flanks and lower belly. the wings are blue-grey, with darker flight feathers and pale markings on the wing coverts. the tail is short and blue-grey, with contrasting dark markings and white patches on the outer feathers. the bill is long, straight, pointed and dark grey, with a darker tip. the eyes are dark brown, and the legs and feet are orange-brown."
}

const goldCrest: bird = {
  "id": uuidv4(),
  "commonName": "goldcrest",
  "scientificName": "regulus regulus",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia"
  ],
  "habitat": [
    "forest",
    "shrubland",
    "tundra and heathland"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "the goldcrest is approximately 9 cm long, with a wingspan of 14–15.5 cm. the upperparts are olive-green, and the underparts are whitish with a buff wash on the breast and flanks. the head has a distinctive crown stripe bordered by black, appearing bright orange in the adult male. the face is plain, with a short, fine, pointed black bill and dark brown eyes. the wings are dark with two conspicuous white wing bars and pale edges on the flight feathers. the tail is short and notched. the legs and feet are brown."
}

const europeanRobin: bird = {
  "id": uuidv4(),
  "commonName": "european robin",
  "scientificName": "erithacus rubecula",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia"
  ],
  "habitat": [
    "forest",
    "urban and suburban",
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "the european robin is 12.5–14.0 cm long. the plumage includes an orange breast and face, bordered by bluish grey on the sides of the neck and chest. the upperparts are brownish, and the belly is whitish. the legs and feet are brown. the bill and eyes are black. the tail is relatively short and brown."
}

const commonBlackBird: bird = {
  "id": uuidv4(),
  "commonName": "common blackbird",
  "scientificName": "turdus merula",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia",
    "central and south asia",
    "australia and oceania"
  ],
  "habitat": [
    "forest",
    "shrubland",
    "urban and suburban"
  ],
  "size": "S",
  "conservationStatus": "least concern",
  "description": "the plumage is glossy black. the length is 23.5–29 cm. the legs are blackish-brown. the eye-ring is yellow, and the bill is orange-yellow, becoming somewhat darker in winter. the tail is long."
}


const houseSparrow:  bird = {
  id: uuidv4(),
  commonName: "house sparrow",
  scientificName: "passer domesticus",
  distribution: [
    "northern europe",
    "non-northern europe",
    "north africa",
    "sub-saharan africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia",
    "north america",
    "south america",
    "australia and oceania"
  ],
  habitat: [
    "urban and suburban",
    "agricultural land",
    "grassland"
  ],
  conservationStatus: "least concern",
  size: "XS",
  description: "Typically about 16 cm long, ranging from 14 to 18 cm, with a wingspan of 19–25 cm and a mass of 24–39.5 g. The house sparrow is a compact bird with a full chest and a large, rounded head. Its bill is stout and conical, and its tail is short. The male has boldly coloured head markings, a reddish-brown back and grey underparts. Its crown is dark grey, with chestnut brown on the sides of the head. It has black around the bill, on the throat and between the bill and eyes, with a small white stripe between the lores and crown and small white spots behind the eyes. The cheeks and underparts are pale grey or white. The upper back and mantle are warm brown with broad black streaks, while the lower back, rump and upper tail coverts are greyish brown. In fresh nonbreeding plumage, the male is duller, with whitish feather tips. The black throat and chest patch, called the bib or badge, becomes more exposed with wear and preening. The male's bill is dark grey, becoming black in the breeding season."
}

const europeanGoldfinch: bird =
{
  "id": uuidv4(),
  "commonName": "european goldfinch",
  "scientificName": "carduelis carduelis",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "middle-east and western asia",
    "central and south asia",
    "australia and oceania",
  ],
  "habitat": [
    "forest",
    "shrubland",
    "grassland",
    "agricultural land",
    "urban and suburban"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "the average European goldfinch is 12–13 cm long. the face is bright red, extending from the forehead to the throat, and is bordered by white areas and a black crown and nape. the sides of the head are white. the upperparts are warm brown, with a black tail and black wings marked by a broad bright yellow band. the breast and belly are white, with buff-brown patches on the sides. the bill is long, pointed and ivory-white, with a dark tip. the eyes are dark brown. the legs and feet are pinkish-brown. the tail is black, with white spots on the tips of the feathers."
}

const eurasianBullfinch: bird = {
  "id": uuidv4(),
  "commonName": "eurasian bullfinch",
  "scientificName": "pyrrhula pyrrhula",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "middle-east and western asia",
    "central and south asia",
    "east asia"
  ],
  "habitat": [
    "forest",
    "urban and suburban"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "typically 14-16 cm long. a bulky bird with a bull-like head. the upperparts are grey, and the flight feathers are black. the bill is short, stocky, and black. the cap and face are black. the rump is white, and the wings have white bars. the chest and underparts are rich red."
}

const yellowhammer: bird = {
  "id": uuidv4(),
  "commonName": "yellowhammer",
  "scientificName": "emberiza citrinella",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "middle-east and western asia",
    "central and south asia",
    "sub-saharan africa",
    "australia and oceania"
  ],
  "habitat": [
    "grassland",
    "agricultural land",
    "shrubland"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "a large bunting, 16–16.5 cm long. the head is bright yellow, the back is heavily streaked brown, the rump is rufous, and the underparts are yellow. the outer tail feathers are white."
}

const commonRedstart: bird = {
   "id": uuidv4(),
   "commonName": "common redstart",
   "scientificName": "phoenicurus phoenicurus",
   "distribution": [
    "northern europe",
    "non-northern europe",
    "middle-east and western asia",
    "central and south asia",
    "north africa",
    "sub-saharan africa"
  ],
  "habitat": [
    "forest",
    "urban and suburban" 
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "a bird 13–14.5 cm long. the head and upperparts are slate-grey, except for the rump and tail, which are orange-chestnut. the flanks, underwing coverts and axillaries are also orange-chestnut. the forehead is white, and the sides of the face and throat are black. the two central tail feathers are dark brown, while the other tail feathers are bright orange-red. the wings are grey-brown. the orange on the flanks shades to almost white on the belly. the bill and legs are black."
}

const barnSwallow: bird = {
  "id": uuidv4(),
  "commonName": "barn swallow",
  "scientificName": "hirundo rustica",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "sub-saharan africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia",
    "southeast asia",
    "north america",
    "south america",
    "australia and oceania"
  ],
  "habitat": [
    "grassland",
    "agricultural land"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "17–19 cm long, including 2–7 cm of elongated outer tail feathers. the upperparts are steel blue, and the forehead, chin, and throat are rufous. the off-white underparts are separated from the throat by a broad dark-blue breast band. the elongated outer tail feathers form a distinctive deeply forked tail, with a line of white spots across the outer end of the upper tail."
}

const sandMartin:bird = {
  "id": uuidv4(),
  "commonName": "sand martin",
  "scientificName": "riparia riparia",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "sub-saharan africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia",
    "southeast asia",
    "north america",
    "south america"
  ],
  "habitat": [
    "freshwater bodies",
    "coastal and marine",
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "length is 12–13 cm. The sand martin is brown above, white below with a narrow brown band on the breast; the bill is black, the legs brown."
}

const whiteWagtail:bird = {
  "id": uuidv4(),
  "commonName": "white wagtail",
  "scientificName": "motacilla alba",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "north africa",
    "sub-saharan africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia",
    "southeast asia"
  ],
  "habitat": [
    "grassland",
    "agricultural land",
    "urban and suburban",
    "freshwater bodies",
    "coastal and marine",
    "freshwater wetlands"
  ],
  "size": "XS",
  "conservationStatus": "least concern",
  "description": "approximately 16.5–19 cm long. the head, throat, and upper breast are black, with a white forehead and sides of the face. the back is grey, and the underparts are white. the wings are black with white edges and a white wing-bar. the long tail is black with white outer feathers. the bill and legs are black."
}

export const europeanGreenWoodpecker: bird = {
  "id": uuidv4(),
  "commonName": "european green woodpecker",
  "scientificName": "picus viridis",
  "distribution": [
    "northern europe",
    "non-northern europe",
    "middle-east and western asia"
  ],
  "habitat": [
    "forest",
    "grassland",
    "agricultural land",
    "urban and suburban",
    "shrubland"
  ],
  "size": "S",
  "conservationStatus": "least concern",
  "description": "30–36 cm long, with a wingspan of 45–51 cm. the upperparts are green, and the underparts are pale yellowish green. the rump is yellow, and the crown and nape are red. the moustachial stripe has a red centre. the lores and area around the white eye are black."
}

const greyHeron: bird = {
  id: uuidv4(),
  commonName: "grey heron",
  scientificName: "ardea cinerea",
  distribution: [
    "northern europe",
    "non-northern europe",
    "north africa",
    "sub-saharan africa",
    "middle-east and western asia",
    "central and south asia",
    "east asia",
    "southeast asia"
  ],
  habitat: [
    "freshwater bodies",
    "freshwater wetlands",
    "coastal and marine",
    "grassland",
  ],
  conservationStatus: "least concern",
  size: "L",
  description: "A large, long-legged wading bird standing up to 100 cm tall and measuring 84–102 cm long, with a wingspan of 155–195 cm and a body weight of 1.02–2.08 kg. Its plumage is largely ashy-grey above and greyish-white below, with some black on the flanks. Adults have a white head and neck with a broad black stripe extending from the eye to a slender, dangling crest, and bluish-black streaks on the front of the neck. The scapular feathers and feathers at the base of the neck are somewhat elongated. Its beak is long, straight and powerful, pinkish-yellow and brighter in breeding adults. The iris is yellow and the legs are brown and very long. Immature birds have a grey head stripe, a paler grey face, a smaller dark grey crest and are generally duller in appearance."
};



export async function displayBirdImage(identifiedBird: bird): Promise<void> {
  const heading = document.querySelector<HTMLHeadingElement>("#bird-commonName");
  heading!.textContent = identifiedBird.commonName;
  const image = document.querySelector<HTMLImageElement>("#bird-image");
  const response = await fetch(
    `https://ornithophile.vercel.app/api/birds?scientific_name=${identifiedBird.scientificName}`
  );
  const data = await response.json();
  const bird = data[0]
  let imageUrl = bird.male_image ;
  if (image && imageUrl) {
    if (imageUrl.startsWith("//upload.wikimedia.org")) {
      imageUrl = "https:" + imageUrl;
    }   
  image.src = imageUrl;
  image.alt = bird.common_name;
  image.style.display = "block";
  }
}
