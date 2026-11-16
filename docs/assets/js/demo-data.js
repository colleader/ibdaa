/* بيانات تجريبية للعرض فقط — كلها تحمل علامة «تجريبي» وتُحذف بزر واحد من لوحة التحكم */
(() => {
  const S = (n) => `طالبة تجريبية ${n}`;
  const T = "تجريبي: ";
  const d = (offsetDays) => new Date(Date.now() + 3 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
  const SEED_FILES = ["demo-01-trophy.jpg","demo-02-star.jpg","demo-03-book.jpg","demo-04-flask.jpg","demo-05-palette.jpg","demo-06-flag.jpg","demo-07-people.jpg","demo-08-cert.jpg","demo-09-grid.jpg","demo-10-bulb.jpg","demo-11-trophy.jpg","demo-12-star.jpg","demo-13-palette.jpg","demo-14-people.jpg","demo-15-book.jpg","demo-16-flask.jpg"];
  const DEMO = [
  // ---------- المسابقات ----------
  { type: 'competition', title: T + 'مسابقة تحدي القراءة', category: 'ثقافية', date: d(-10), end_date: d(20), featured: 1,
    summary: 'مثال توضيحي لمسابقة مفتوحة: تشجيع الطالبات على القراءة وتلخيص الكتب.',
    body: 'هذا نص تجريبي يوضح شكل وصف المسابقة. تقرأ كل طالبة عدداً من الكتب خلال مدة المسابقة وتكتب ملخصاً لكل كتاب، ثم تُقيَّم الملخصات من لجنة المسابقة.',
    conditions: 'أن تكون الطالبة منتظمة في المدرسة\nتسليم الملخصات قبل نهاية المسابقة\nالالتزام بالأمانة العلمية',
    images: ['03-book', '15-book'] },
  { type: 'competition', title: T + 'مسابقة الابتكار العلمي', category: 'علمية', date: d(14), end_date: d(45),
    summary: 'مثال لمسابقة قادمة: عرض مشاريع علمية مبتكرة تحل مشكلات من البيئة المحيطة.',
    body: 'نص تجريبي: تعمل الطالبات في فرق صغيرة لتصميم فكرة أو نموذج علمي، وتُعرض المشاريع في يوم مفتوح.',
    conditions: 'فريق من 2 إلى 4 طالبات\nتقديم ملخص الفكرة مكتوباً\nإحضار نموذج أو عرض تقديمي',
    images: ['04-flask', '10-bulb'] },
  { type: 'competition', title: T + 'مسابقة الخط العربي', category: 'فنية', date: d(-60), end_date: d(-40),
    summary: 'مثال لمسابقة منتهية مع إعلان الفائزات.',
    body: 'نص تجريبي يوضح عرض نتائج مسابقة منتهية مع أسماء الفائزات ومراكزهن.',
    conditions: 'كتابة النص المحدد بخط النسخ أو الرقعة\nاستخدام ورق مقاس A4',
    winners: [{ name: S(1), rank: 'المركز الأول' }, { name: S(2), rank: 'المركز الثاني' }, { name: S(3), rank: 'المركز الثالث' }],
    images: ['05-palette', '13-palette'] },
  { type: 'competition', title: T + 'مسابقة حفظ القرآن الكريم', category: 'دينية', date: d(-120), end_date: d(-90),
    summary: 'مثال لمسابقة سابقة من العام الماضي.', body: 'نص تجريبي.',
    winners: [{ name: S(4), rank: 'المركز الأول' }, { name: S(5), rank: 'المركز الثاني' }],
    images: ['15-book'] },

  // ---------- الإنجازات ----------
  { type: 'achievement', title: T + 'المركز الأول في مسابقة الإلقاء', category: 'ثقافية', level: 'محلي', date: d(-25), featured: 1,
    people: S(1), summary: 'مثال على إنجاز محلي على مستوى إدارة التعليم.',
    body: 'نص تجريبي يوضح طريقة توثيق إنجاز طالبة، مع صورة الشهادة وتفاصيل المسابقة.', images: ['01-trophy', '08-cert'] },
  { type: 'achievement', title: T + 'تأهل فريق المدرسة للتصفيات الوطنية', category: 'علمية', level: 'وطني', date: d(-45), featured: 1,
    people: 'فريق تجريبي (أ)', summary: 'مثال على إنجاز وطني لفريق من الطالبات.',
    body: 'نص تجريبي: تأهل الفريق بعد المنافسة مع مدارس أخرى.', images: ['04-flask', '08-cert'] },
  { type: 'achievement', title: T + 'مشاركة متميزة في معرض دولي للابتكار', category: 'تقنية', level: 'دولي', date: d(-80), featured: 1,
    people: S(6), summary: 'مثال على إنجاز دولي.', body: 'نص تجريبي.', images: ['10-bulb', '08-cert'] },
  { type: 'achievement', title: T + 'جائزة أفضل عمل فني', category: 'فنية', level: 'محلي', date: d(-200),
    people: S(2), summary: 'مثال على إنجاز من العام الماضي.', body: 'نص تجريبي.', images: ['13-palette'] },

  // ---------- المشاركات ----------
  { type: 'participation', title: T + 'المشاركة في احتفال اليوم الوطني', category: 'مناسبات وطنية', level: 'مدرسية', date: d(-55),
    summary: 'مثال على مشاركة في مناسبة وطنية.', body: 'نص تجريبي يصف فقرات المشاركة.',
    result: 'تكريم الطالبات المشاركات بشهادات شكر', people: `${S(3)}، ${S(7)}، ${S(8)}`, images: ['06-flag', '07-people'] },
  { type: 'participation', title: T + 'معرض العلوم المدرسي', category: 'علمية', level: 'مدرسية', date: d(-30),
    summary: 'مثال على مشاركة علمية داخل المدرسة.', body: 'نص تجريبي.', result: 'عرض 12 مشروعاً علمياً',
    people: `${S(6)}، ${S(9)}`, images: ['16-flask', '10-bulb'] },
  { type: 'participation', title: T + 'ملتقى الفنون التشكيلية', category: 'فنية', level: 'خارجية', date: d(-15),
    summary: 'مثال على مشاركة خارجية فنية.', body: 'نص تجريبي.', result: 'حصول عمل على إشادة لجنة التحكيم',
    people: S(2), images: ['05-palette', '09-grid'] },
  { type: 'participation', title: T + 'المشاركة في ملتقى القراءة', category: 'ثقافية', level: 'خارجية', date: d(-8),
    summary: 'مثال على مشاركة ثقافية خارجية.', body: 'نص تجريبي.', people: `${S(1)}، ${S(10)}`, images: ['03-book'] },

  // ---------- الفعاليات ----------
  { type: 'event', title: T + 'اليوم المفتوح للأنشطة', category: 'فعالية مدرسية', date: d(3), time: '09:00', location: 'ساحة المدرسة',
    summary: 'مثال لفعالية قادمة تظهر في التقويم.', body: 'نص تجريبي يصف برنامج الفعالية.', images: ['07-people', '09-grid'] },
  { type: 'event', title: T + 'ورشة التصميم الرقمي', category: 'ورشة عمل', date: d(9), time: '10:30', location: 'مصادر التعلم',
    summary: 'مثال لورشة عمل قادمة.', body: 'نص تجريبي.', images: ['09-grid'] },
  { type: 'event', title: T + 'حفل تكريم المتميزات', category: 'حفل', date: d(24), time: '08:00', location: 'المسرح المدرسي',
    summary: 'مثال لحفل تكريم قادم.', body: 'نص تجريبي.', images: ['02-star', '11-trophy'] },
  { type: 'event', title: T + 'أسبوع اللغة العربية', category: 'فعالية مدرسية', date: d(-20), end_date: d(-16), location: 'المدرسة',
    summary: 'مثال لفعالية منتهية مع تغطية مصورة.', body: 'نص تجريبي.', images: ['03-book', '15-book', '13-palette'] },

  // ---------- الأخبار والإعلانات ----------
  { type: 'news', title: T + 'فتح باب التسجيل في مسابقة تحدي القراءة', date: d(-2), category: 'إعلان',
    summary: 'مثال لإعلان يظهر في شريط الإشعارات وفي قسم الأخبار.', body: 'نص تجريبي للإعلان.', images: ['15-book'] },
  { type: 'news', title: T + 'تكريم الفائزات في مسابقة الخط العربي', date: d(-35), category: 'خبر',
    summary: 'مثال لخبر عن تكريم.', body: 'نص تجريبي للخبر.', images: ['12-star'] },
  { type: 'news', title: T + 'إطلاق منصة إبداع الوزية', date: d(-1), category: 'خبر', featured: 1,
    summary: 'مثال لخبر: انطلاق المنصة الرسمية لتوثيق النشاط الطلابي.', body: 'نص تجريبي.', images: ['02-star'] },

  // ---------- معرض الإبداع ----------
  { type: 'gallery', title: T + 'لوحات فنية من أعمال الطالبات', category: 'تصاميم فنية', date: d(-12),
    summary: 'مثال لألبوم صور في المعرض.', images: ['05-palette', '13-palette', '09-grid'] },
  { type: 'gallery', title: T + 'مشروع نموذج المدينة الذكية', category: 'مشاريع وابتكارات', date: d(-28),
    summary: 'مثال لمشروع ابتكاري.', images: ['10-bulb', '16-flask'] },
  { type: 'gallery', title: T + 'من أعمال نادي القراءة', category: 'أعمال الطالبات', date: d(-40),
    summary: 'مثال لأعمال الطالبات.', images: ['03-book', '15-book'] },
  { type: 'gallery', title: T + 'لقطات من اليوم الوطني', category: 'صور', date: d(-55),
    summary: 'مثال لصور فعالية.', images: ['06-flag', '07-people', '14-people'] },

  // ---------- لوحة الشرف ----------
  { type: 'honor', title: S(1), distinction: 'التميّز الثقافي', rank: 1, date: d(-20),
    summary: 'المركز الأول في مسابقة الإلقاء (مثال)', body: 'نص تجريبي.', images: ['08-cert'] },
  { type: 'honor', title: S(6), distinction: 'التميّز العلمي', rank: 2, date: d(-20),
    summary: 'مشاركة في معرض دولي للابتكار (مثال)', body: 'نص تجريبي.', images: ['08-cert'] },
  { type: 'honor', title: S(2), distinction: 'التميّز الفني', rank: 3, date: d(-20),
    summary: 'جائزة أفضل عمل فني (مثال)', body: 'نص تجريبي.', images: ['08-cert'] },
  { type: 'honor', title: S(3), distinction: 'المبادرة والتطوع', rank: 4, date: d(-20),
    summary: 'مشاركة فاعلة في المناسبات الوطنية (مثال)', body: 'نص تجريبي.' },
  { type: 'honor', title: S(9), distinction: 'التفوق الدراسي', rank: 5, date: d(-20),
    summary: 'تفوق دراسي ومشاركة علمية (مثال)', body: 'نص تجريبي.' },
];
  window.IBDAA_DEMO = { DEMO, SEED_FILES };
})();
