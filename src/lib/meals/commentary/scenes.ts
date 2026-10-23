import type { MealScenario } from "./types";

export const sceneScenarios = [
  {
    id: "napkin", kind: "scene", when: "menu",
    variants: [
      "Peçeteyi açarken iki tane olduğunu fark ettim. Birini karşıya bıraktım.",
      "Peçeteyi üçgen yaptım. Tabağın yanına küçük bir çadır kuruldu.",
      "Peçeteyi küçük bir kare yaptım. Köşesi yine açılınca kaşığı üstüne koydum.",
    ],
  },
  {
    id: "chair", kind: "scene", when: "menu",
    variants: [
      "Sandalyeyi çektim, biraz ses çıktı. İkinci denemede daha yavaş çektim.",
      "Masaya oturdum, tabak uzakta kaldı. Sandalyeyle birlikte biraz yaklaştık.",
      "Sandalyemi masaya yaklaştırdım. Personel kartım tabağın üstüne sarkınca onu da yana çektim.",
    ],
  },
  {
    id: "cutlery", kind: "scene", when: "menu",
    variants: [
      "Kaşığın içine bakınca yüzüm ters göründü. Kaşığı çevirdim, bu kez burnum büyüdü.",
      "Kaşıkla çatalı yan yana düzelttim. Tepsiyi kaldırınca ikisi de eski yerine kaydı.",
      "Çatal peçetenin dışına taşıyordu. Peçeteyi açınca çatal sığdı ama peçete tepsiden taştı.",
    ],
  },
  {
    id: "make-room", kind: "scene", when: "menu",
    variants: [
      "Masadaki notları topladım. Tabağın yeri ortaya çıktı.",
      "Kaldığım sayfaya kalemimi koyup defteri kapattım. Tabağımı boşalan yere yerleştirdim.",
      "Masamdaki bitkinin yaprağı tabağın üstüne gelmiş. Saksıyı biraz yana çektim, yaprağa da yer kaldı.",
    ],
  },
  {
    id: "whole-menu", kind: "scene", when: "source",
    variants: [
      "Menüyü okurken sıra bana gelmiş. Elimdeki kâğıdı bırakıp tepsiyi aldım.",
      "Menüyü önüme açınca arkadaşım da okumak istedi. Kâğıdın köşelerini birlikte tuttuk.",
      "Menüyü önüme koydum. Tabağa yer kalmayınca kâğıdı biraz yana çektim.",
    ],
  },
  {
    id: "menu-paper", kind: "scene", when: "source",
    variants: [
      "Menüyü parmağımla takip ederek okudum. Arkadaşım bir satırı gösterince onun kaldığı yerden devam etmişim.",
      "Arkadaşım gözlüğünü ararken menüyü sesli okudum. Gözlüğünü bulunca da dinlemeye devam etti.",
      "Menüyü katlayınca son satır içeride kaldı. Açık dursun diye kenarına bardağımı koydum.",
    ],
  },
  {
    id: "consider-choices", kind: "scene", when: "alternatives",
    variants: [
      "Ana yemekleri iki kez okudum. İkinci okuyuşta başka birinde durdum.",
      "Birini işaretlemek için kalemi aldım. Önce hepsini okumaya karar verdim.",
      "Yemekleri düşünürken peçeteyi katlamışım. Peçete hazır, ben birazdan.",
    ],
  },
  {
    id: "leave-time", kind: "scene", when: "alternatives",
    variants: [
      "Ana yemekleri sesli okuyunca yanımdaki de düşünmeye başladı. İkimiz de menüyü bırakmadık.",
      "Seçeneklere bakmak için tabağı kenara koydum. Biraz erken almışım.",
      "Bir yemek seçip menüyü kapattım. Arkadaşım öbürünü okuyunca tekrar açtım.",
    ],
  },
  {
    id: "single-main", kind: "scene", when: "single-main",
    variants: [
      "Ana yemeği okuyup menüyü bıraktım. Arkadaşım adını sorunca tam söyleyebilmek için geri aldım.",
      "Ana yemeği okuyup menüyü arkadaşıma uzattım. O da arkasına uzatınca kâğıt masayı dolaştı.",
      "Ana yemek aklımda. Patilerimi yıkamaya giderken adını içimden tekrarladım.",
    ],
  },
  {
    id: "shared-side", kind: "scene", when: "shared-side",
    variants: [
      "Ana yemeği seçmeden yanına alacağımı seçmişim. Tabağın ortasını şimdilik boş bıraktım.",
      "Yanında ne olduğunu önce okudum. Arkadaşım ana yemeği sorunca menünün başına birlikte döndük.",
      "İki ayrı ana yemek seçtik, yanlarına aynı yemek geldi. Arkadaşımın tabağı bir yanıyla benimkine benziyordu.",
    ],
  },
  {
    id: "soup-first", kind: "scene", when: "soup",
    variants: [
      "Önce çorba için kaşığı hazırladım. Çatalın biraz beklemesi gerekecek.",
      "Çorba kâsesini önüme aldım. Tabağı biraz ileri itince ikisine de yer oldu.",
      "Çorbayı görünce kaşığı aradım. Tepsinin öbür ucuna kadar gitmiş.",
    ],
  },
  {
    id: "company", kind: "scene", when: "menu",
    variants: [
      "Masada bir sandalye daha var. Önüne de peçete bıraktım.",
      "Tabağımı biraz yana aldım. Yanıma biri oturursa yer hazır.",
      "Bir peçeteyi katlayıp karşıya koydum. Arkadaşım şeklini bozmadan tabağının yanına taşıdı.",
    ],
  },
] as const satisfies readonly MealScenario[];
