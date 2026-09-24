// All user-facing text (Uzbek, Latin script). Edit wording here; the code only uses these keys.
// Texts that need a value inside (a number, a name) are small functions.

const BRAND_NAME = "[PLATFORMA NOMI]";

export const uz = {
  brand: {
    name: BRAND_NAME,
    tagline: "Ma'lumotlar tahlilini o'zbek tilida o'rganing",
    adminName: "Boshqaruv paneli",
    // Support link shown in the profile panel (placeholder: put your Telegram link here).
    supportUrl: "https://t.me/",
  },

  common: {
    loading: "Yuklanmoqda...",
    save: "Saqlash",
    saving: "Saqlanmoqda...",
    saved: "Saqlandi",
    cancel: "Bekor qilish",
    close: "Yopish",
    back: "Orqaga",
    home: "Bosh sahifa",
    retry: "Qayta urinish",
    soon: "Tez orada",
    yes: "Ha",
    no: "Yo'q",
    or: "yoki",
    som: "so'm",
  },

  nav: {
    catalog: "Kurslar",
    myCourses: "Mening kurslarim",
    login: "Kirish",
    profile: "Profil",
    openProfile: "Profil sozlamalarini ochish",
    logout: "Hisobdan chiqish",
    skipToContent: "Asosiy mazmunga o'tish",
  },

  home: {
    title: "Ma'lumotlar tahlilini real biznes vazifalarida o'rganing",
    lead: "Excel, Power BI, SQL va Python bo'yicha bosqichma-bosqich kurslar. Har bir darsda video, biznes vazifa va amaliy mashq.",
    ctaStart: "Boshlash",
    ctaCourses: "Kurslarni ko'rish",
    coursesTitle: "Kurslar",
    bundlesTitle: "To'plamlar",
    empty: "Hozircha kurslar yo'q. Tez orada qo'shiladi.",
    loadError: "Kurslarni yuklab bo'lmadi. Sahifani yangilab ko'ring.",
    notConfigured: "Ma'lumotlar bazasi hali ulanmagan. README.md dagi 2-qadamni bajaring.",
    lessons: (n: number) => `${n} ta dars`,
    courses: (n: number) => `${n} ta kurs`,
  },

  auth: {
    title: "Kirish yoki ro'yxatdan o'tish",
    adminTitle: "Boshqaruv paneliga kirish",
    lead: "Telefon raqamingizga SMS kod yuboramiz. Hisob bo'lmasa, avtomatik yaratiladi.",
    phoneLabel: "Telefon raqam",
    phoneHint: "Masalan: 90 123 45 67",
    sendCode: "Kod olish",
    sending: "Yuborilmoqda...",
    codeLabel: "SMS kod",
    codeSentTo: (phone: string) => `Kod ${phone} raqamiga yuborildi.`,
    changePhone: "Raqamni o'zgartirish",
    verify: "Tasdiqlash",
    verifying: "Tekshirilmoqda...",
    resendIn: (s: number) => `Kodni qayta yuborish: ${s} soniya`,
    resend: "Kodni qayta yuborish",
    continueWith: "Boshqa usul bilan kirish",
    google: "Google orqali kirish",
    apple: "Apple orqali kirish",
    facebook: "Facebook orqali kirish",
    redirecting: "Yo'naltirilmoqda...",
    linkHint:
      "Avval telefon bilan ro'yxatdan o'tgan bo'lsangiz, telefon bilan kiring. Google hisobini keyin profilda bog'lashingiz mumkin, shunda ikki xil hisob paydo bo'lmaydi.",
    terms: "Kirish orqali siz foydalanish shartlariga rozilik bildirasiz.",
    reasons: {
      device:
        "Siz bu qurilmada hisobdan chiqarildingiz: hisobingizga boshqa qurilmadan kirildi. Bir vaqtda ko'pi bilan 2 ta qurilmada foydalanish mumkin.",
      deviceRemoved: "Bu qurilma hisobingizdan chiqarildi. Davom etish uchun qaytadan kiring.",
      loggedOut: "Siz hisobdan chiqdingiz.",
      loginRequired: "Davom etish uchun hisobingizga kiring.",
    },
  },

  errors: {
    generic: "Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.",
    network: "Internet aloqasini tekshiring va qayta urinib ko'ring.",
    invalidPhone: "Telefon raqamni to'liq kiriting: 9 ta raqam, masalan 90 123 45 67.",
    invalidCode: "Kod 6 ta raqamdan iborat bo'lishi kerak.",
    codeWrong: "Kod noto'g'ri yoki muddati o'tgan. Qayta tekshiring yoki yangi kod oling.",
    tooManyRequests: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.",
    tooManyAttempts: "Kod juda ko'p marta noto'g'ri kiritildi. 15 daqiqadan keyin yangi kod oling.",
    waitBeforeResend: "Yangi kodni 60 soniyadan keyin so'rashingiz mumkin.",
    smsFailed: "SMS yuborilmadi. Raqamni tekshiring yoki birozdan keyin qayta urinib ko'ring.",
    phoneTaken:
      "Bu raqam boshqa hisobga bog'langan. O'sha hisobga telefon orqali kiring va profilda Google'ni bog'lang. Yordam kerak bo'lsa, qo'llab-quvvatlash xizmatiga yozing.",
    identityTaken: "Bu hisob allaqachon boshqa foydalanuvchiga bog'langan.",
    lastMethod: "Bu yagona kirish usulingiz. Uni o'chirishdan oldin boshqa usulni bog'lang.",
    linkingDisabled: "Hisoblarni bog'lash hozircha o'chirilgan.",
    phoneDisabled: "Telefon orqali kirish hozircha ishlamayapti.",
    oauthFailed: "Kirish yakunlanmadi. Qayta urinib ko'ring.",
    sessionRevoked: "Bu qurilmadagi sessiya yopilgan. Qaytadan kiring.",
    notLoggedIn: "Avval hisobingizga kiring.",
    nameInvalid: "Ism 2 tadan 80 tagacha belgidan iborat bo'lsin.",
    notConfigured: "Server sozlanmagan: muhit o'zgaruvchilari yetishmayapti.",
  },

  profile: {
    title: "Profil",
    personal: "Shaxsiy ma'lumotlar",
    fullName: "Ism va familiya",
    fullNamePlaceholder: "Masalan: Aziza Karimova",
    phone: "Telefon",
    phoneVerified: "Tasdiqlangan",
    phoneMissing: "Telefon raqam qo'shilmagan",
    verifyPhone: "Telefonni tasdiqlash",
    phoneRequiredNote: "Xarid qilish uchun tasdiqlangan telefon raqam kerak (to'lov kvitansiyasi va SMS kod uchun).",
    email: "Email",
    emailMissing: "Email yo'q",
    methods: "Kirish usullari",
    methodsLead: "Bir nechta usulni bog'lasangiz, istalganidan bitta hisobga kirasiz.",
    methodPhone: "Telefon (SMS)",
    methodGoogle: "Google",
    methodApple: "Apple",
    methodFacebook: "Facebook",
    linked: "Bog'langan",
    link: "Bog'lash",
    unlink: "Uzish",
    unlinkConfirm: (name: string) => `${name} kirish usulini uzmoqchimisiz?`,
    purchases: "Xaridlar va kvitansiyalar",
    purchasesEmpty: "Hozircha xaridlar yo'q.",
    devices: "Faol qurilmalar",
    devicesLead: "Hisobingizdan bir vaqtda ko'pi bilan 2 ta qurilmada foydalanish mumkin.",
    thisDevice: "Shu qurilma",
    lastSeen: (when: string) => `Oxirgi faollik: ${when}`,
    signOutDevice: "Chiqarish",
    signOutDeviceConfirm: "Bu qurilmani hisobdan chiqarasizmi?",
    devicesEmpty: "Faol qurilmalar yo'q.",
    theme: "Mavzu",
    themeLight: "Yorug'",
    themeDark: "Qorong'i",
    support: "Qo'llab-quvvatlash",
    supportText: "Savol yoki muammo bo'lsa, bizga yozing.",
    supportLink: "Telegram orqali yozish",
    loadError: "Profilni yuklab bo'lmadi.",
    unknownDevice: "Noma'lum qurilma",
  },

  noAccess: {
    title: "Bu sahifaga kirish huquqi yo'q",
    text: "Bu dars yoki kurs sotib olinmagan. Kursni sotib oling yoki boshqa hisob bilan kiring.",
    toCatalog: "Kurslarga qaytish",
  },

  notFound: {
    title: "Sahifa topilmadi",
    text: "Siz izlagan sahifa mavjud emas yoki o'chirilgan.",
  },

  errorPage: {
    title: "Nimadir noto'g'ri ketdi",
    text: "Sahifani yuklashda xatolik yuz berdi.",
  },

  admin: {
    forbiddenTitle: "Ruxsat yo'q",
    forbiddenText: "Boshqaruv paneli faqat administratorlar uchun. Boshqa hisob bilan kiring.",
    loginOther: "Boshqa hisob bilan kirish",
    nav: {
      dashboard: "Boshqaruv",
      courses: "Kurslar",
      modules: "Modullar va darslar",
      bundles: "To'plamlar",
      promo: "Promo kodlar",
      orders: "Buyurtmalar va to'lovlar",
      students: "Talabalar",
      datasets: "Datasetlar",
      exercises: "Mashqlar",
      archive: "Arxiv",
    },
    dashboard: {
      title: "Boshqaruv",
      lead: "Platforma holati bir qarashda.",
      students: "Talabalar",
      courses: "Kurslar",
      lessons: "Darslar",
      bundles: "To'plamlar",
      activeDevices: "Faol qurilmalar",
      phaseNote: "Daromad, sotuvlar va faollik statistikasi to'lovlar ulanganidan keyin (3-bosqich) shu yerda chiqadi.",
    },
  },

  // SMS text. Eskiz must approve this exact template before real SMS are delivered.
  sms: {
    otp: (code: string) => `${BRAND_NAME}: tasdiqlash kodi ${code}. Kodni hech kimga bermang.`,
  },
} as const;

export type Uz = typeof uz;
