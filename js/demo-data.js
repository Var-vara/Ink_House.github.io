window.DEMO_DATA = {
  works: [
    {
      id: "demo-1", slug: "gorod-pod-steklom", title: "Город под стеклом", type: "book",
      genre: "Городское фэнтези", description: "В городе, где воспоминания продают в стеклянных флаконах, молодая архивистка находит память о событии, которого никогда не было.",
      cover_url: "images/cover-book.svg", status: "published", featured: true, created_at: "2026-07-01T12:00:00Z"
    },
    {
      id: "demo-2", slug: "posledniy-fonar", title: "Последний фонарь", type: "story",
      genre: "Мистика", description: "Короткая история о ночном смотрителе, который однажды зажигает фонарь для человека из собственного прошлого.",
      cover_url: "images/cover-story.svg", status: "published", featured: true, created_at: "2026-07-10T12:00:00Z"
    },
    {
      id: "demo-3", slug: "pisma-moryu", title: "Письма морю", type: "illustrated",
      genre: "Иллюстрированная проза", description: "История в письмах и рисунках о доме у холодного моря, который помнит всех своих жильцов.",
      cover_url: "images/cover-illustrated.svg", status: "published", featured: true, created_at: "2026-07-18T12:00:00Z"
    }
  ],
  chapters: {
    "demo-1": [
      { id: "c1", chapter_number: 1, title: "Флакон № 17", is_published: true, content_json: [
        { type: "heading", text: "Утро в архиве" },
        { type: "text", text: "Каждое утро Лея протирала стеклянные полки мягкой тканью. Внутри флаконов мерцали чужие воспоминания: первое слово ребёнка, вкус летнего яблока, страх перед закрытой дверью.\n\nФлакон номер семнадцать появился без накладной." },
        { type: "quote", text: "Некоторые воспоминания выбирают хозяина сами." },
        { type: "text", text: "На этикетке было написано её имя. Но дату Лея не узнала: она наступит только через три года." }
      ]},
      { id: "c2", chapter_number: 2, title: "Улица без отражений", is_published: true, content_json: [
        { type: "text", text: "За дверями архива дождь превращал город в расплывчатый рисунок. Лея спрятала флакон во внутренний карман и пошла туда, где улицы переставали отражаться в витринах." }
      ]}
    ],
    "demo-2": [
      { id: "c3", chapter_number: 1, title: "Последний фонарь", is_published: true, content_json: [
        { type: "text", text: "В полночь на старой набережной оставался только один работающий фонарь. Его смотритель утверждал, что свет нужен не живым, а тем, кто всё ещё ищет дорогу домой." },
        { type: "text", text: "В ту ночь под фонарём остановился мальчик в пальто, которое смотритель носил сорок лет назад." }
      ]}
    ],
    "demo-3": [
      { id: "c4", chapter_number: 1, title: "Письмо первое", is_published: true, content_json: [
        { type: "text", text: "Море, сегодня дом снова скрипел всю ночь. Мне кажется, он пытается рассказать, кто жил здесь до нас." },
        { type: "image", url: "images/story-sea.svg", caption: "Дом на берегу — демонстрационная иллюстрация" },
        { type: "text", text: "На чердаке я нашла карту, но вместо названий на ней были записаны человеческие имена." }
      ]}
    ]
  },
  gallery: [
    { id: "g1", title: "Дом у моря", description: "Эскиз для иллюстрированного рассказа.", image_url: "images/gallery-sea.svg", published: true },
    { id: "g2", title: "Окно архива", description: "Концепт места, где хранятся воспоминания.", image_url: "images/gallery-window.svg", published: true },
    { id: "g3", title: "Ночная дорога", description: "Фотографическое настроение для будущего рассказа.", image_url: "images/gallery-road.svg", published: true }
  ]
};
