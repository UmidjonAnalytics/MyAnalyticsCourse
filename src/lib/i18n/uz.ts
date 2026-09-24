// All user-facing text lives here. Edit wording freely; keep the keys unchanged.

export const uz = {
  brand: {
    name: "[PLATFORMA NOMI]",
    tagline: "O'zbek tilida ma'lumotlar tahlili",
  },
  common: {
    loading: "Yuklanmoqda...",
    error: "Xatolik yuz berdi",
    tryAgain: "Qayta urinish",
    backHome: "Bosh sahifaga qaytish",
    save: "Saqlash",
    cancel: "Bekor qilish",
    close: "Yopish",
  },
  landing: {
    title: "Ma'lumotlar tahlilini real biznes vazifalari orqali o'rganing",
    description:
      "Bosqichma-bosqich o'quv yo'li, har bir dars uchun biznes vazifasi va platformaning ichida ishlaydigan SQL mashqlari. Videolar YouTube'da bepul, bu yerda esa ularni amalda qo'llaysiz.",
    points: [
      "Haftalar va darslar bo'yicha aniq reja, progressingiz saqlanadi",
      "Har bir darsda real kompaniyadagidek biznes vazifasi",
      "Haqiqiy, \"iflos\" ma'lumotlar bilan amaliy mashqlar",
      "SQL javobingiz avtomatik tekshiriladi va maslahat beriladi",
    ],
    priceLabel: "To'liq kirish",
    price: "1 990 000 so'm",
    priceNote: "Bir martalik to'lov",
    loginTitle: "Kirish",
    loginHint: "Telegram orqali bir bosishda kiring. Parol kerak emas.",
    loggingIn: "Kirilmoqda...",
    loginFailed: "Kirish amalga oshmadi. Qayta urinib ko'ring.",
    widgetMissing:
      "Telegram tugmasi sozlanmagan. Administrator bot nomini kiritishi kerak.",
    devLogin: "Test foydalanuvchi sifatida kirish (faqat lokal)",
  },
  signOutReasons: {
    device:
      "Siz boshqa qurilmadan kirganingiz uchun bu qurilmadan chiqarildingiz. Bitta hisobdan bir vaqtda ko'pi bilan 2 ta qurilmada foydalanish mumkin.",
    expired: "Sessiya muddati tugadi. Iltimos, qayta kiring.",
  },
  learn: {
    welcome: (name: string) => `Xush kelibsiz, ${name}!`,
    phaseNote:
      "O'quv sahifasi keyingi bosqichda tayyor bo'ladi. Hozircha hisobingiz va qurilmalaringizni tekshirishingiz mumkin.",
    courses: "Kurslar",
    noCourses: "Hozircha e'lon qilingan kurs yo'q.",
    lessonsCount: (n: number) => `${n} ta dars`,
  },
  access: {
    full: "To'liq kirish",
    none: "Kirish yo'q",
    noneDescription:
      "Darslarning to'liq mazmunini ko'rish uchun kursga kirish kerak. To'lov va kirish bo'yicha menga Telegram orqali yozing.",
    contact: "Telegram orqali bog'lanish",
    contactUrl: "https://t.me/USERNAME",
    title: "Bu dars yopiq",
  },
  devices: {
    title: "Faol qurilmalar",
    limitNote: "Bir vaqtda ko'pi bilan 2 ta qurilmada kirish mumkin.",
    thisDevice: "Shu qurilma",
    lastSeen: "Oxirgi faollik",
    logout: "Chiqarish",
    logoutConfirm: "Shu qurilmani hisobdan chiqarasizmi?",
    empty: "Faol qurilma yo'q.",
    unknown: "Noma'lum qurilma",
  },
  profile: {
    logout: "Hisobdan chiqish",
    telegram: "Telegram",
    accessStatus: "Kirish holati",
  },
  admin: {
    title: "Boshqaruv paneli",
    phaseNote: "Admin bo'limlari keyingi bosqichda qo'shiladi.",
    backToSite: "Saytga qaytish",
    stats: {
      totalStudents: "Jami talabalar",
      withAccess: "Kirish huquqi borlar",
      active7d: "So'nggi 7 kunda faol",
    },
    nav: {
      dashboard: "Bosh sahifa",
      courses: "Kurslar",
      students: "Talabalar",
      datasets: "Datasetlar",
      archive: "Arxiv",
    },
  },
  notFound: {
    title: "Sahifa topilmadi",
    description: "Siz qidirgan sahifa mavjud emas yoki ko'chirilgan.",
  },
  errors: {
    generic: "Kutilmagan xatolik yuz berdi. Sahifani yangilab ko'ring.",
    forbidden: "Bu amal uchun ruxsat yo'q.",
    unauthorized: "Avval tizimga kiring.",
    invalidRequest: "So'rov noto'g'ri.",
    telegramInvalid: "Telegram ma'lumotlari tasdiqlanmadi.",
    telegramExpired: "Telegram ma'lumotlari eskirgan. Qayta kiring.",
  },
} as const;

export type UzStrings = typeof uz;
