import type { MealScenario } from "./types";

export const pairScenarios = [
  {
    id: "beans-fresh-beans", kind: "pair",
    requires: [{ food: "beans" }, { food: "freshBeans" }],
    variants: [
      "Fasulyenin kurusu da var, tazesi de. Bugün birlikte gelmişler.",
      "Fasulye var dedim, arkadaşım hangisi diye sordu. Menüyü ona uzattım, ikisi de oradaydı.",
      "Menüde iki kez fasulye gördüm. İkinci bakışta birinin taze olduğunu fark ettim.",
    ],
  },
  {
    id: "bafra-adana", kind: "pair",
    requires: [{ food: "bafra", role: "main" }, { food: "adanaBorek", role: "accompaniment" }],
    variants: [
      "Bafra pidesini seçmiştim. Yanında Adana böreği de olduğunu duyunca menüyü geri istedim.",
      "Bafra'yla Adana'yı haritada buldum. Menüde birbirlerine daha yakın duruyorlar.",
      "Ben Bafra pidesini gösterdim, arkadaşım Adana böreğini. Menüyü ikimizin de göreceği yere koyduk.",
    ],
  },
  {
    id: "beans-rice", kind: "pair",
    requires: [{ food: "beans" }, { food: "rice", role: "accompaniment" }],
    variants: [
      "Fasulyeyi okuyunca pilavı sordum. Arkadaşım alt satırı gösterdi, ben daha oraya gelmemiştim.",
      "Pilavı okudum, fasulyeye geri döndüm. İkisini aynı tabakta düşündüm.",
      "Fasulye ve pilav menüde ayrı satırlarda. Tabağımda komşu olacaklar.",
    ],
  },
  {
    id: "beans-pickles", kind: "pair",
    requires: [{ food: "beans" }, { food: "pickles", role: "extras" }],
    variants: [
      "Fasulyeyi görünce gözüm turşuyu aradı. Alt taraftaymış.",
      "Fasulyenin yanına turşu aldım. Bir parçayı çatala takmaya çalışırken tabağın öbür ucuna kaçırdım.",
      "Fasulyenin yanına turşu aldım. Yanımdaki de isteyince kâseyi ona biraz daha yaklaştırdım.",
    ],
  },
  {
    id: "beans-cacik", kind: "pair",
    requires: [{ food: "beans" }, { food: "cacik", role: "extras" }],
    variants: [
      "Fasulyenin yanına cacık aldım. İkisinin de içinde kaşık vardı, elimdekini sessizce tepsiye bıraktım.",
      "Fasulyenin yanına cacık da alacağım. Tabağı biraz yana çektim, kâseye yer kalsın.",
      "Fasulyeyle cacığı taşıyordum. Arkadaşım kapıyı açınca ikisini de dökmeden geçebildim.",
    ],
  },
  {
    id: "chickpeas-rice", kind: "pair",
    requires: [{ food: "chickpeas" }, { food: "rice", role: "accompaniment" }],
    variants: [
      "Nohutla pilav için tabağın iki yanını ayırdım. Ortada buluşabilirler.",
      "Nohutla pilavı ayrı ayrı aldım. Tepsiyi taşırken bir nohut pilava geçti.",
      "Nohutla pilavı tabağa yan yana aldım. Ortadaki lokmada ikisi de vardı.",
    ],
  },
  {
    id: "chickpeas-cacik", kind: "pair",
    requires: [{ food: "chickpeas" }, { food: "cacik", role: "extras" }],
    variants: [
      "Nohutla cacık alacağımı söyledim. Arkadaşım da aynısını isteyince boş tepsisini benimkinin yanına koydum.",
      "Nohudu görünce tabağı hazırladım. Cacığı görünce bir kâse daha ekledim.",
    ],
  },
  {
    id: "lahmacun-lemon", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "lemon" }],
    variants: [
      "Lahmacunu gördüm, limonu aradım. O da buradaymış.",
      "Lahmacunla limon menünün ayrı yerlerinde. Ben onları yan yana düşündüm.",
      "Lahmacunun yanına limon da alacağım. Daha tabağım yok, limonu düşünüyorum.",
    ],
  },
  {
    id: "lahmacun-mercimek", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "mercimekSoup", role: "soup" }],
    variants: [
      "Mercimek çorbasıyla lahmacunu arkadaşıma okudum. Lahmacun deyince o da yanıma oturdu.",
      "Mercimek çorbasıyla başlayacağım. Lahmacunu da aklımda tuttum.",
      "Önce lahmacunu okudum, sonra mercimek çorbasını. Sofrada sırayı ters çevireceğim.",
    ],
  },
  {
    id: "courgette-twice", kind: "pair",
    requires: [{ food: "courgette", role: "vegetarian" }, { food: "courgetteFry", role: "extras" }],
    variants: [
      "Kabağı ana yemeklerde gördüm, yoğurtlusunu da aşağıda buldum. İki ayrı yere uğramış.",
      "Kabak dedim, hangisi diye sordular. Menüde iki ayrı yerde görünce parmağımla seçtiğimi gösterdim.",
      "Kabak yemeğini seçmiştim, yoğurtlu kabağı da gördüm. Hangisini istediğimi söylemek sandığımdan uzun sürdü.",
    ],
  },
  {
    id: "lahmacun-haydari", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "haydari", role: "extras" }],
    variants: [
      "Lahmacunun yanına haydariyi de aldım. Küçük tabağı nereye koysam diye bakarken arkadaşım bana yer açtı.",
      "Lahmacunu seçmiştim, haydariyi de ekledim. Arkadaşım bitti mi diye sorunca menünün altına bir daha baktım.",
    ],
  },
  {
    id: "lahmacun-ezme", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "ezme", role: "extras" }],
    variants: [
      "Lahmacunun yanına ne alırım diye bakıyordum. Ezmeyi görünce aramayı bıraktım.",
      "Ezme aşağıda, lahmacun yukarıdaymış. Ben onları tabağın aynı tarafına aldım.",
      "Lahmacunu dürüm yapmıştım, ezmeyi unuttuğumu fark ettim. Bir ucunu yeniden açtım.",
    ],
  },
  {
    id: "lahmacun-ice-cream", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "iceCream", role: "dessert" }],
    variants: [
      "Lahmacunla dondurmayı aynı menüde gördüm. İkincisi için küçük kaşığı ayırdım.",
      "Lahmacunu söylerken dondurmayı da sordum. Tatlıya daha var dediler, ben şimdiden merak etmiştim.",
      "Bir gözüm lahmacunda, diğeri dondurmada kaldı. Neyse ki aynı anda gelmeleri gerekmiyor.",
    ],
  },
  {
    id: "lahmacun-sekerpare", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "sekerpare", role: "dessert" }],
    variants: [
      "Lahmacunu sesli okudum, şekerpareyi içimden. Arkadaşım tatlıda ne var diye sorunca onu da söyledim.",
      "Şekerpareyi görünce lahmacuna geri döndüm. İkisini seçtiğimi söylerken menünün iki ucunu gösterdim.",
      "Lahmacunu beklerken şekerpare nasıl yapılıyor diye sordum. Daha ilk yemek gelmeden tatlıyı konuşuyorduk.",
    ],
  },
  {
    id: "lahmacun-imam-bayildi", kind: "pair",
    requires: [{ food: "lahmacun", role: "main" }, { food: "imamBayildi", role: "vegetarian" }],
    variants: [
      "Lahmacun yazan yerde karar vermiştim. İmam bayıldıyı da görünce menüyü elimde biraz daha tuttum.",
      "İmam bayıldı mı, lahmacun mu diye düşünürken arkamda biri bekliyormuş. Kenara çekilip ona yol verdim.",
      "Lahmacunla imam bayıldı arasında kaldım. Arkadaşıma sordum, o da bana sordu.",
    ],
  },
  {
    id: "bafra-tomato", kind: "pair",
    requires: [{ food: "bafra", role: "main" }, { food: "tomatoSoup", role: "soup" }],
    variants: [
      "Bafra pidesini düşünerek oturdum. Domates çorbası gelince pideyi biraz sonraya bıraktım.",
      "Bafra pidesi aklımdaydı. Domates çorbası için önce kâseyi aldım.",
      "Domates çorbasından Bafra pidesine kadar okudum. Karnım ses çıkarınca menüyü bırakıp kalktım.",
    ],
  },
  {
    id: "bafra-cacik", kind: "pair",
    requires: [{ food: "bafra", role: "main" }, { food: "cacik", role: "extras" }],
    variants: [
      "Bafra pidesiyle cacık aldım. Pideyi tutunca kaşığa uzanacak boş patim kalmadı.",
      "Bafra pidesinin yanına cacık da alacaktım. Kâseye yer açarken peçetem masadan düştü, önce onu aldım.",
      "Bafra pidesini bir yana, cacığı öbür yana koydum. Ben ikisinin ortasına oturdum.",
    ],
  },
  {
    id: "bafra-kisir", kind: "pair",
    requires: [{ food: "bafra", role: "main" }, { food: "kisir", role: "extras" }],
    variants: [
      "Bafra pidesini seçtim, yanına da kısır aldım. Tabağa bakarken pideyi nereden tutacağımı düşündüm.",
      "Kısırı görünce Bafra pidesinin yanındaki yeri boş bıraktım.",
    ],
  },
  {
    id: "corn-twice", kind: "pair",
    requires: [{ food: "cornRice", role: "accompaniment" }, { food: "cornSalad", role: "extras" }],
    variants: [
      "Mısır hem pilavda hem salatada. Küçük taneler menüye dağılmış.",
      "Mısır pilavda da var, salatada da. İkisinin arasındaki satırlarda da aradım.",
      "Pilavdaki mısırı fark etmiştim. Salatada da karşıma çıkınca gülümsedim.",
    ],
  },
  {
    id: "tandir-ic-pilav", kind: "pair",
    requires: [{ food: "tandir", role: "main" }, { food: "icPilav", role: "accompaniment" }],
    variants: [
      "Kuzu tandırla iç pilavı yan yana düşündüm. Tabağı henüz almadan yerleri belli oldu.",
      "Kuzu tandırla iç pilavın tarifini dinledim. İkisini aynı anda nasıl yetiştirdiklerini de sordum.",
    ],
  },
  {
    id: "nuar-ic-pilav", kind: "pair",
    requires: [{ food: "nuar", role: "main" }, { food: "icPilav", role: "accompaniment" }],
    variants: [
      "Nuarın adını yavaşça okudum. İç pilava gelince dilim hızlandı.",
      "İç pilavı tanıdım, dana nuarı merak ettim. Arkadaşıma sorunca o da menüye yakından baktı.",
    ],
  },
  {
    id: "bulgur-yogurt", kind: "pair",
    requires: [{ food: "bulgur", role: "accompaniment" }, { food: "yogurt", role: "extras" }],
    variants: [
      "Bulgur pilavına yoğurt ekledim. Karıştırınca pilavı göremedim, kaşığı biraz daha derine daldırdım.",
      "Bulgur pilavına yoğurt ekleyecektim. Kaşıktan düşmeyince biraz daha bekledim.",
      "Yoğurdu bulgur pilavının üstüne mi koysam diye düşündüm. Şimdilik yan yana duruyorlar.",
    ],
  },
  {
    id: "pasta-yogurt", kind: "pair",
    requires: [{ food: "pasta", role: "accompaniment" }, { food: "yogurt", role: "extras" }],
    variants: [
      "Makarna da var, yoğurt da. Çatalı elime alınca ikisini bir arada düşündüm.",
      "Yoğurdu makarnaya eklerken arkadaşım da istedi. Kâseyi aramıza koydum.",
      "Yoğurdu makarnanın üstüne mi, yanına mı koysam diye düşündüm. Henüz ikisini de almamıştım.",
    ],
  },
  {
    id: "kisir-cacik", kind: "pair",
    requires: [{ food: "kisir", role: "extras" }, { food: "cacik", role: "extras" }],
    variants: [
      "Kısırla cacık aynı bölümdeymiş. O satırda beklediğimden uzun kaldım.",
      "Diğer seçeneklere bakayım dedim. Kısırla cacığı görünce küçük tabağı da aldım.",
    ],
  },
  {
    id: "cacik-pickles", kind: "pair",
    requires: [{ food: "cacik", role: "extras" }, { food: "pickles", role: "extras" }],
    variants: [
      "Cacıkla turşuyu tepsiye koydum. Yürürken cacığa bakıyordum, turşu da sallanıyormuş.",
      "Cacığı seçtim, turşuyu arkadaşım istedi. Ortaya koyunca ikimizin de eli yetişti.",
      "Cacıkla turşuyu taşırken masada yer aradım. Arkadaşım tepsisini kaydırınca ikisi de sığdı.",
    ],
  },
  {
    id: "tomato-haydari", kind: "pair",
    requires: [{ food: "tomatoSoup", role: "soup" }, { food: "haydari", role: "extras" }],
    variants: [
      "Domates çorbasıyla haydariyi tepsime koydum. Yan yana sığmayınca küçük tabağı kendime doğru çektim.",
      "Haydariyi görünce küçük bir tabak aldım. Domates çorbası için olan kâse zaten hazırdı.",
      "Domates çorbasını bitirip haydariyi önüme çektim. Boş kâseyi kaldırınca dirseğime de yer açıldı.",
    ],
  },
  {
    id: "tomato-magnolia", kind: "pair",
    requires: [{ food: "tomatoSoup", role: "soup" }, { food: "magnolia", role: "dessert" }],
    variants: [
      "Domates çorbasını seçip menüyü bırakacaktım. Magnolyayı görünce küçük kaşığı da yanıma aldım.",
      "Ben domates çorbasını okuyordum, arkadaşım magnolyaya gelmiş. Tatlıyı anlatmaya başlayınca alt satıra geçtim.",
      "Domates çorbasından magnolyaya kadar okudum. Şimdi aynı yolu sofrada izleyeceğim.",
    ],
  },
  {
    id: "mercimek-kasik-salad", kind: "pair",
    requires: [{ food: "mercimekSoup", role: "soup" }, { food: "kasikSalad", role: "extras" }],
    variants: [
      "Mercimek çorbası için kaşığı aldım. Sonra menüde kaşık salatasını gördüm.",
      "Kaşık salatasını merak edip nasıl doğrandığını sordum. Mercimek çorbasını içerken anlatılanları dinledim.",
      "Kaşık salatasının adını okurken elimdeki kaşığa baktım. Onu mercimek çorbası için almıştım.",
    ],
  },
  {
    id: "fresh-beans-yayla", kind: "pair",
    requires: [{ food: "freshBeans", role: "vegetarian" }, { food: "yayla", role: "soup" }],
    variants: [
      "Taze fasulyeyi seçince yayla çorbasını da ekledim. Yanımdaki de aynısını isteyince kâseleri birlikte taşıdık.",
      "Taze fasulyeye karar verdim. Yayla çorbasını da görünce çatalı bırakıp önce kaşığı aldım.",
    ],
  },
  {
    id: "barbunya-almond-rice", kind: "pair",
    requires: [{ food: "barbunya", role: "vegetarian" }, { food: "almondRice", role: "accompaniment" }],
    variants: [
      "Barbunyanın yanındaki pilavı okuyup geçmiştim. Bademli olduğunu ikinci bakışta fark ettim.",
      "Barbunyanın yanına bademli pilav koydum. Bir badem barbunyaya geçmiş, kaşıkla pilava geri götürdüm.",
    ],
  },
  {
    id: "artichoke-cacik", kind: "pair",
    requires: [{ food: "artichoke", role: "extras" }, { food: "cacik", role: "extras" }],
    variants: [
      "Cacığı okuyup geçiyordum, enginarı da gördüm. O satıra geri döndüm.",
      "Enginarı ben seçtim, cacığı arkadaşım aldı. Masaya oturunca ikisini de ortaya çektik.",
    ],
  },
  {
    id: "carrot-twice", kind: "pair",
    requires: [{ food: "carrotTarator", role: "extras" }, { food: "carrotSalad", role: "salad" }],
    variants: [
      "Havucu salatada gördüm, taratorda da buldum. Menünün iki yerinde karşılaştık.",
      "Havuç hem salatada hem taratorda. Adını bir kez söyleyip menüde iki ayrı yeri gösterdim.",
      "Havuç istedim, salata mı tarator mu diye sordular. Cevap vermeden menüye bir daha baktım.",
    ],
  },
  {
    id: "tomato-twice", kind: "pair",
    requires: [{ food: "tomatoSoup", role: "soup" }, { food: "tomatoSogus", role: "salad" }],
    variants: [
      "Domates çorbada da var, söğüşte de. İkincisinde yanına salatalık almış.",
      "Domatesi çorbada da, söğüşte de buldum. Arkadaşım hangisini dediğimi sorunca ikisini de gösterdim.",
      "Domates çorbasıyla söğüşü seçtim. Domates bugün sofraya iki türlü gelmiş.",
    ],
  },
  {
    id: "vermicelli-twice", kind: "pair",
    requires: [{ food: "sehriyeSoup", role: "soup" }, { food: "vermicelliRice", role: "accompaniment" }],
    variants: [
      "Şehriye çorbada da var, pilavda da. Kaşığı nereye götürsem karşılaşacağız.",
      "Şehriye çorbasını okuyup pilava geçtim. Yine şehriye yazınca doğru satırda mıyım diye bir daha baktım.",
      "Şehriyeyi çorbada bulmuştum. Pilava da uğramış, onu sonradan fark ettim.",
    ],
  },
  {
    id: "tarhana-pasta", kind: "pair",
    requires: [{ food: "tarhana", role: "soup" }, { food: "pasta", role: "accompaniment" }],
    variants: [
      "Tarhanayla makarna var. Kaşıkla çatalı yan yana koydum, sırayla kullanacağım.",
      "Tarhanayla başlayacağım dedim, arkadaşım makarnayı sordu. Menüyü ortaya koyup kaldığımız yerden okuduk.",
      "Arkadaşım tarhana için kaşık, makarna için çatal uzattı. Elimdeki menüyü ona verip ikisini de aldım.",
    ],
  },
  {
    id: "cabbages", kind: "pair",
    requires: [{ food: "brussels", role: "extras" }, { food: "redCabbage" }],
    variants: [
      "Brüksel lahanasıyla kırmızı lahana aynı menüde. Soyadları aynı diye yan yana yazdım.",
      "Lahana alacağım dedim, hangisi diye sordular. Kırmızıyla Brüksel arasında karar vermem gerekiyormuş.",
      "Kırmızı lahanayı tanıyordum, Brüksel lahanasını sordum. Arkadaşım küçük dedi, ne kadar küçük olduğunu görmeye gittim.",
    ],
  },
  {
    id: "chickpeas-pickles", kind: "pair",
    requires: [{ food: "chickpeas" }, { food: "pickles", role: "extras" }],
    variants: [
      "Nohudun yanına turşu koyarken tabağı eğdim. Nohutlar turşunun yanına geldi.",
      "Nohutla turşuyu aldım. Arkadaşım turşuyu sorunca tabağı aramıza çektim, onun da çatalı hazırmış.",
    ],
  },
  {
    id: "rice-sutlac", kind: "pair",
    requires: [{ food: "rice", role: "accompaniment" }, { food: "sutlac", role: "dessert" }],
    variants: [
      "Pilavı bitirip sütlaca geçtim. Kaşığı bırakmak için biraz erkenmiş.",
      "Pilavın yanına sütlacı da koydum. Tatlıyı sona bırakacaktım, tepside en yakınıma gelmiş.",
    ],
  },
] as const satisfies readonly MealScenario[];
