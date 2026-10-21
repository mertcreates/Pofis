import type { MealScenario } from "./types";

export const dishScenarios = [
  {
    id: "lahmacun", kind: "dish", requires: [{ food: "lahmacun", role: "main" }],
    variants: [
      "Lahmacun için peçete alırken arkadaşım da istedi. Bir tane de onun önüne bıraktım.",
      "Lahmacun yazan satırda durdum. Menüyü arkadaşıma uzatırken parmağım hâlâ oradaydı.",
      "Lahmacun varmış deyip ellerimi yıkamaya kalktım. Yanımdaki de benimle kalktı.",
    ],
  },
  {
    id: "bafra", kind: "dish", requires: [{ food: "bafra", role: "main" }],
    variants: [
      "Bafra pidesini görünce masadaki yerimi biraz açtım.",
      "Bafra pidesindeki Bafra'yı haritada buldum. Pideyi beklerken sokak adlarına da baktım.",
      "Bafra pidesini arkadaşıma sordum. Bafra'yı anlatmaya başladı, ben pideyi merak etmiştim.",
    ],
  },
  {
    id: "pide", kind: "dish", requires: [{ food: "pide", role: "main" }],
    variants: [
      "Pideyi elimle mi yesem diye düşündüm. Gelince bakarım deyip çatalı şimdilik bıraktım.",
      "Pide diye not almıştım. Yanımdaki hangisi diye sorunca menüyü yeniden açtım.",
      "Menüde pide varmış. Ellerimi yıkayıp geliyorum.",
    ],
  },
  {
    id: "etli-ekmek", kind: "dish", requires: [{ food: "etliEkmek", role: "main" }],
    variants: [
      "Etli ekmeği nasıl yediklerini sordum. Arkadaşım eliyle gösterince çatalı bıraktım.",
      "Etli ekmeği seçince menüyü arkaya uzattım. Başka bakacak biri yokmuş, masaya bıraktım.",
    ],
  },
  {
    id: "musakka", kind: "dish", requires: [{ food: "musakka", role: "main" }],
    variants: [
      "Patlıcan musakkayı seçtim. Öbür yemekleri de okuyayım dedim ama yine aynı satıra döndüm.",
      "Musakkayı görünce yemeğe kalktım. Elimdeki kalemi bırakmak için masama geri döndüm.",
    ],
  },
  {
    id: "imam-bayildi", kind: "dish", requires: [{ food: "imamBayildi", role: "vegetarian" }],
    variants: [
      "İmam bayıldı yazan yerde durdum. Adını kimin koyduğunu merak ettim.",
      "İmam bayıldının adını nereden aldığını sordum. Hikâyeyi dinlerken yanımdaki de sandalyesini yaklaştırdı.",
    ],
  },
  {
    id: "kofte", kind: "dish", requires: [{ food: "kofte", role: "main" }],
    variants: [
      "Menüde köfte var dedim. Arkadaşım hangisi diye sorunca atladığım sözcükleri de okudum.",
      "Köfteyi seçtim, arkadaşım da aynısını istedi. Sıramız gelince ikimiz birden söyledik.",
    ],
  },
  {
    id: "beans", kind: "dish", requires: [{ food: "beans" }],
    variants: [
      "Kuru fasulye varmış diye arkama döndüm. Arkadaşım da aynı şeyi söylemek için bana dönmüş.",
      "Kuru fasulye diyecektim. Karnım benden önce ses çıkardı.",
      "Kuru fasulyeye çatal mı, kaşık mı alsam diye düşündüm. İkisini de aldım, masada karar veririm.",
    ],
  },
  {
    id: "fresh-beans", kind: "dish", requires: [{ food: "freshBeans" }],
    variants: [
      "Taze fasulyenin saksıda yetişip yetişmediğini merak ettim. Masamdaki bitkinin yanına bir saksı daha sığar mı diye baktım.",
      "Taze fasulyeyi seçtim. Arkadaşım menüye uzanınca okuduğum satırı ona da gösterdim.",
    ],
  },
  {
    id: "chickpeas", kind: "dish", requires: [{ food: "chickpeas" }],
    variants: [
      "Nohudu görünce kaşığı da aldım. Yuvarlak şeyler bazen çataldan kaçıyor.",
      "Nohudun bitkisine baktım. Küçük bir kabuğun içinden çıkıyormuş, ben hep tabaktaki hâlini biliyordum.",
    ],
  },
  {
    id: "barbunya", kind: "dish", requires: [{ food: "barbunya" }],
    variants: [
      "Barbunya yazdığım kâğıdı arkadaşım alışveriş listesi sandı. Kalemini çıkarınca menüyü gösterdim.",
      "Barbunyanın bitkisini merak edip resmine baktım. Tanelerini tanıdım, yapraklarını ilk kez görüyordum.",
    ],
  },
  {
    id: "peas", kind: "dish", requires: [{ food: "peas", role: "vegetarian" }],
    variants: [
      "Bezelyeyi görünce kaşığı düşündüm. Tek tek peşinden gitmek zor olabilir.",
      "Tabağın kenarında bir bezelye kalmıştı. Tabağı bırakacakken onu fark edip geri oturdum.",
    ],
  },
  {
    id: "turlu", kind: "dish", requires: [{ food: "turlu", role: "vegetarian" }],
    variants: [
      "Türlünün içindekileri tek tek tanımaya çalıştım. Bir parçayı gösterip arkadaşımın da fikrini aldım.",
      "Türlünün içinde kimler var diye sordum. Sebzeleri saymaya başladılar, ben de dinledim.",
    ],
  },
  {
    id: "spinach", kind: "dish", requires: [{ food: "spinach", role: "vegetarian" }],
    variants: [
      "Arkadaşım ıspanağı yıkamanın uzun sürdüğünü anlattı. Ben yalnız pişmesini beklemek gerekir sanıyordum.",
      "Ispanağı seçince arkadaşım evde nasıl yaptığını anlattı. Tarif bitince ikimiz de acıkmıştık.",
    ],
  },
  {
    id: "rice", kind: "dish", requires: [{ food: "rice", role: "accompaniment" }],
    variants: [
      "Pirinç pilavını görünce tabağın bir kenarını boş bıraktım.",
      "Pilavdan bir kaşık aldım, birkaç tane tabakta kaldı. Kaşığı bırakmadan onları da topladım.",
    ],
  },
  {
    id: "almond-rice", kind: "dish", requires: [{ food: "almondRice", role: "accompaniment" }],
    variants: [
      "Pilavı okudum, geçiyordum. Bademli kısmını fark edince geri döndüm.",
      "Bademli pilavın tarifini sordum. Bademleri ne zaman ekleyeceğimi unutmayayım diye o kısmı iki kez dinledim.",
      "Pilavdan aldığım kaşığın üstünde bir badem duruyordu. Düşürmeden ağzıma götürdüm.",
    ],
  },
  {
    id: "bulgur", kind: "dish", requires: [{ food: "bulgur", role: "accompaniment" }],
    variants: [
      "Bulgur pilavını görünce kaşığı yanıma aldım. Masada aramayayım.",
      "Bulgur pilavının tarifini yazmak için defterimi açtım. Arkadaşım birlikte yaparız deyince kapattım.",
    ],
  },
  {
    id: "spaghetti", kind: "dish", requires: [{ food: "spaghetti", role: "accompaniment" }],
    variants: [
      "Spagetti yazıyor. Çatalı elimde bir tur çevirdim, hazırlık olsun.",
      "Spagetti için peçeteyi boynuma taktım. Personel kartım altında kalınca peçeteyi biraz yana kaydırdım.",
      "Spagettiyi çatala dolamayı havada denedim. Karşımdaki ne yaptığımı sorunca menüyü gösterdim.",
    ],
  },
  {
    id: "pasta", kind: "dish", requires: [{ food: "pasta", role: "accompaniment" }],
    variants: [
      "Makarnanın nasıl yapıldığını sorunca iki kişi anlatmaya başladı. Ben tek bir tarif için kalem çıkarmıştım.",
      "Makarna için çatalı aldım. Sapında kendimi görünce burnumu biraz yaklaştırdım.",
    ],
  },
  {
    id: "ic-pilav", kind: "dish", requires: [{ food: "icPilav", role: "accompaniment" }],
    variants: [
      "İç pilavın içindekileri sordum. Sandığımdan uzun sürdü, kaşığı bırakıp dinledim.",
      "İç pilavın adını merak ettim. Arkadaşım anlatırken yemeğin adından başlayıp dolmalara geldik.",
    ],
  },
  {
    id: "manti-extra", kind: "dish", requires: [{ food: "manti", role: "extras" }],
    variants: [
      "Mantıyı en altta buldum. İyi ki sonuna kadar okumuşum.",
      "Diğer seçeneklere şöyle bir bakacaktım. Mantıyı görünce biraz durdum.",
      "Mantıyı ana yemeklerde arıyordum. Yan taraftan çıktı.",
    ],
  },
  {
    id: "adana-borek", kind: "dish", requires: [{ food: "adanaBorek", role: "accompaniment" }],
    variants: [
      "Yanında ne var diye baktım. Adana böreğiyle karşılaştım.",
      "Ana yemeğin yanında Adana böreği varmış. Tabağımda ona da yer ayırdım.",
      "Pilav ararken Adana böreğini gördüm. Yanında yazan yere bir daha baktım.",
    ],
  },
  {
    id: "sarma", kind: "dish", requires: [{ food: "sarma", role: "extras" }],
    variants: [
      "Yaprak sarmayı nasıl sardıklarını gösterdiler. Ben de denedim, bir ucunu kapatınca öbürü açıldı.",
      "Menüde sarma varmış. Küçük tabağı yanıma aldım.",
    ],
  },
  {
    id: "artichoke", kind: "dish", requires: [{ food: "artichoke", role: "extras" }],
    variants: [
      "Enginarın çiçeğini merak edip resmine baktım. Menüyü kapatıp bir süre çiçeği inceledim.",
      "Enginarı seçtim. Arkadaşım ben de deyince ona da küçük bir tabak aldım.",
    ],
  },
  {
    id: "mercimek-soup", kind: "dish", requires: [{ food: "mercimekSoup", role: "soup" }],
    variants: [
      "Mercimek çorbasını alırken peçete de uzattılar. Ellerim doluydu, arkadaşım alıp tepsime koydu.",
      "Menüyü mercimek çorbasından okumaya başladım. Yemeğe de oradan başlayacağım.",
    ],
  },
  {
    id: "tomato-soup", kind: "dish", requires: [{ food: "tomatoSoup", role: "soup" }],
    variants: [
      "Domates çorbasını taşırken kâsenin kenarına bir damla bulaştı. Peçeteyle silip temiz tarafından tuttum.",
      "Domates çorbası için kaşığı aldım. Arkadaşım boş kâseleri dizerken ben de peçeteleri dağıttım.",
    ],
  },
  {
    id: "tarhana", kind: "dish", requires: [{ food: "tarhana", role: "soup" }],
    variants: [
      "Tarhana varmış. Kaşığı elime aldım, menüyü öbür patimle tutuyorum.",
      "Tarhananın nasıl yapıldığını sordum. Anlatmaya başlayınca kaşığı bırakıp dinledim.",
    ],
  },
  {
    id: "ezogelin", kind: "dish", requires: [{ food: "ezogelin", role: "soup" }],
    variants: [
      "Ezogelin çorbasını söylemek için nefes aldım. Yanımdaki benden önce söyleyince başımı salladım.",
      "Ezogelinin adı nereden geliyor diye sordum. Çorba gelene kadar onu konuştuk.",
    ],
  },
  {
    id: "yayla", kind: "dish", requires: [{ food: "yayla", role: "soup" }],
    variants: [
      "Yayla çorbasını okuyunca aklıma dağlar geldi. Çorbayı beklerken defterime iki tepe çizdim.",
      "Yayla çorbasını taşırken kaşık kâseye vurdu. Kaşığı öbür elime alınca sessizce yürüyebildim.",
    ],
  },
  {
    id: "chicken-soup", kind: "dish", requires: [{ food: "chickenSoup", role: "soup" }],
    variants: [
      "Tavuklu çorbaya eğilince personel kartım da kâseye yaklaştı. Kartı yana alıp yeniden eğildim.",
      "Tavuklu çorbayı alırken arkadaşım masada yer ayırdı. Kâsemi koyup ona da bir sandalye çektim.",
    ],
  },
  {
    id: "sehriye-soup", kind: "dish", requires: [{ food: "sehriyeSoup", role: "soup" }],
    variants: [
      "Şehriye çorbası varmış. Kaşığı kâsenin yanına bıraktım.",
      "Şehriye çorbasından bir kaşık aldım. Kaşıktaki tek şehriyeye bakarken çorbayı içmeyi unuttum.",
    ],
  },
  {
    id: "cold-soup", kind: "dish", requires: [{ food: "coldSoup", role: "soup" }],
    variants: [
      "Soğuk çorba varmış. Kaşığı aldım, alışkanlıkla üfleyecektim.",
      "Soğuk çorbanın adını sordum, yine soğuk çorba dediler. Kâseye biraz daha yakından baktım.",
    ],
  },
  {
    id: "fruit", kind: "dish", requires: [{ food: "fruit", role: "dessert" }],
    variants: [
      "Meyvenin hangisi olduğunu sordum. Yanımdaki de bilmiyormuş, birlikte bakmaya gittik.",
      "Meyvenin adını yazmamışlar. Ben de notuma küçük bir soru işareti koydum.",
      "Arkadaşım meyve için elma olabilir dedi. Aklımda elma kalmış, kesin değil deyince yeniden merak ettim.",
    ],
  },
  {
    id: "drink", kind: "dish", requires: [{ food: "drink", role: "dessert" }],
    variants: [
      "İçecek yazısını okuyup bardağa baktım. Ne olduğunu öğrenmeden masada yerini ayırmışım.",
      "İçecek yazısını biraz büyüttüm. Ne olduğu hâlâ yazmıyordu.",
    ],
  },
  {
    id: "ice-cream", kind: "dish", requires: [{ food: "iceCream", role: "dessert" }],
    variants: [
      "Menüde dondurma olduğunu söyleyince arkadaşım gülümsedi. Ben de o satıra bakıyordum.",
      "Dondurma yazan satırı arkadaşıma gösterdim. O da bana elindeki küçük kaşığı gösterdi.",
      "Dondurma için külah çiziyordum. Arkadaşım kâsede de gelebilir deyince yanına bir kâse ekledim.",
    ],
  },
  {
    id: "kazandibi", kind: "dish", requires: [{ food: "kazandibi", role: "dessert" }],
    variants: [
      "Kazandibini görünce menüyü biraz kendime çektim. Yanımdaki de tatlıya bakıyormuş, ortaya geri koydum.",
      "Kazandibini görünce küçük kaşığı aldım. Öğünün sonuna saklıyorum.",
    ],
  },
  {
    id: "sutlac", kind: "dish", requires: [{ food: "sutlac", role: "dessert" }],
    variants: [
      "Sütlacı görünce arkadaşıma nasıl yaptığını sordum. Fotoğrafını da çekmiş, telefonu birlikte inceledik.",
      "Menüde sütlaç varmış. Tatlı kısmını okumayı bitirince başa dönebildim.",
    ],
  },
  {
    id: "magnolia", kind: "dish", requires: [{ food: "magnolia", role: "dessert" }],
    variants: [
      "Magnolyanın adını iki kez okudum. Yanımdaki tatlıyı sorunca düşünmeden söyledim.",
      "Magnolyayı görünce son satırda durdum. Menünün başını henüz okumamıştım.",
    ],
  },
  {
    id: "profiterol", kind: "dish", requires: [{ food: "profiterol", role: "dessert" }],
    variants: [
      "Menüde profiterolü görünce adını sesli söyledim. Yanımdaki de tatlı kısmına geçti.",
      "Profiterol için kaşık alıyordum, arkadaşım da istedi. İki tane taşıyıp birini onun peçetesine bıraktım.",
    ],
  },
  {
    id: "sekerpare", kind: "dish", requires: [{ food: "sekerpare", role: "dessert" }],
    variants: [
      "Şekerpareyi alıp masaya dönerken arkadaşım tatlıyı sordu. Tabağı gösterince o da kalktı.",
      "Menüyü kapatacaktım, şekerpareyi fark ettim. Son kısmı da okudum.",
      "Şekerpare diye sesli okudum. Yan masadan biri nerede diye sorunca menüyü ona çevirdim.",
    ],
  },
  {
    id: "kemalpasa", kind: "dish", requires: [{ food: "kemalpasa", role: "dessert" }],
    variants: [
      "Kemalpaşa deyince yanımdaki hangi Kemalpaşa diye sordu. Menünün tatlı kısmını gösterdim.",
      "Tatlı kısmında Kemalpaşa varmış. Küçük tabağı en sona ayırdım.",
    ],
  },
  {
    id: "sutlu-nuriye", kind: "dish", requires: [{ food: "sutluNuriye", role: "dessert" }],
    variants: [
      "Sütlü nuriyeyi not ettim. Yanımdaki kimi yazdığımı sorunca menüyü gösterdim.",
      "Tatlıda sütlü nuriye varmış. Küçük tabağı ayırıp menünün başına döndüm.",
    ],
  },
  {
    id: "chicken", kind: "dish", requires: [{ food: "chicken", role: "main" }],
    variants: [
      "Tavuk yemeğini görünce personel kartımı yana aldım. Tabağa sarkmasın.",
      "Tavuk diye not almışım. Nasıl yapıldığını hatırlamak için menüyü yeniden açtım.",
    ],
  },
  {
    id: "kebab", kind: "dish", requires: [{ food: "kebab", role: "main" }],
    variants: [
      "Kebabın adını okurken karnım ses çıkardı. Ben de menüyü masaya bıraktım.",
      "Menüde kebap varmış. Çatalı elimde tutarak menüyü kapatmak biraz zor oldu.",
    ],
  },
  {
    id: "saute", kind: "dish", requires: [{ food: "saute", role: "main" }],
    variants: [
      "Et yemeği için tabağı aldım. Yanımdaki de uzanınca ona da bir tabak verdim.",
      "Et yemeğinin tarifini sordum. Arkadaşım göz kararı deyince tencereye ne kadar yakından baktığını merak ettim.",
    ],
  },
  {
    id: "roast", kind: "dish", requires: [{ food: "roast", role: "main" }],
    variants: [
      "Rostoyu alıp masaya döndüm. Arkadaşım bardakları taşıyordu, önündeki sandalyeyi çektim.",
      "Rostoyu seçip masaya geçtim. Arkadaşım ne aldığımı sorunca tabağı ona doğru çevirdim.",
    ],
  },
  {
    id: "tantuni", kind: "dish", requires: [{ food: "tantuni", role: "main" }],
    variants: [
      "Tantuniyi görünce iki peçete aldım. Birini cebime koydum, öbürü masada.",
      "Tantuniyi nasıl hazırladıklarını izledim. Bittiğini görünce kendi tabağımı da uzattım.",
    ],
  },
  {
    id: "tandir", kind: "dish", requires: [{ food: "tandir", role: "main" }],
    variants: [
      "Kuzu tandır için tabak alırken arkadaşıma da uzattım. İkimiz de aynı yemeği düşünüyormuşuz.",
      "Tandırın nasıl yapıldığını sordum. Anlatan arkadaşımı dinlerken tabakları taşımaya yardım ettim.",
    ],
  },
  {
    id: "nuar", kind: "dish", requires: [{ food: "nuar", role: "main" }],
    variants: [
      "Dana nuarın adını yavaşça okudum. Masada sorarken doğru söyleyeyim.",
      "Dana nuarın tarifine baktım. İlk kez okuduğum bir kelime daha çıktı, onu da aradım.",
    ],
  },
  {
    id: "begendi", kind: "dish", requires: [{ food: "begendi", role: "main" }],
    variants: [
      "Hünkâr beğendinin adını görünce masada biraz dik oturdum.",
      "Hünkâr beğendinin adını nereden aldığını sordum. Anlatan kişi bitirince menüdeki adına bir daha baktım.",
      "Hünkâr beğendi dedim, arkadaşım afiyet olsun dedi. Daha menüyü okuyordum ama teşekkür ettim.",
    ],
  },
  {
    id: "tirit", kind: "dish", requires: [{ food: "tirit", role: "main" }],
    variants: [
      "Tirit nasıl yapılıyor diye sordum. Tarif uzayınca kalemimi çıkarıp anlatılanları yazmaya başladım.",
      "Tiride yakından bakmak için biraz öne eğildim. Arkadaşım tabağı bana doğru çevirdi.",
      "Tirit yazan yeri parmağımla gösterdim. Yanımdaki de merak edip menüye eğildi.",
    ],
  },
] as const satisfies readonly MealScenario[];
