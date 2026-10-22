// Контент-план блога beloVET: темы под информационные запросы владельцев, привязанные к позициям прайса.
// Приоритет — гипотеза до проверки по Вордстату и Вебмастеру:
//   1 — высокий спрос и близость к записи (симптомы, «что делать», стерилизация/кастрация)
//   2 — средний спрос, хорошо дополняет страницу операции
//   3 — нишевая тема, пишем после основных
// intent: symptom — «что случилось и что делать»; howto — подготовка/уход; explain — что за болезнь; decide — сомнения перед решением
// ops — slug страниц операций, на которые ведёт статья; status: published — статья написана (data/blog/<slug>.js)

const RUBRICS = {
  urgent: 'Экстренные ситуации',
  neuter: 'Стерилизация и кастрация',
  care: 'Подготовка и восстановление',
  onco: 'Опухоли',
  ortho: 'Травмы и ортопедия',
  uro: 'Мочевыделительная система',
  repro: 'Беременность и роды',
  skin: 'Кожа, раны, уши'
};

const PLAN = [
  // --- Экстренные ситуации
  { slug: 'kot-ne-mozhet-popisat', title: 'Кот не может пописать: что делать и почему нельзя ждать', query: 'кот не может пописать', more: ['кот не писает', 'кот часто ходит в лоток', 'закупорка уретры у кота'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['uretrostomiya', 'cistotomiya'] },
  { slug: 'sobaka-proglotila-predmet', title: 'Собака проглотила посторонний предмет: что делать', query: 'собака проглотила', more: ['собака съела носок', 'собака проглотила игрушку', 'инородное тело у собаки'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['gastrotomiya', 'enterotomiya'] },
  { slug: 'koshka-proglotila-nitku', title: 'Кошка проглотила нитку или дождик: чем опасно и что делать', query: 'кошка проглотила нитку', more: ['кошка съела дождик', 'нитка из попы у кошки', 'линейное инородное тело'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['rezekciya-kishechnika', 'enterotomiya'] },
  { slug: 'sobaka-sela-kost', title: 'Собака съела кость: опасно ли и как понять, что нужна помощь', query: 'собака съела кость', more: ['собака подавилась костью', 'кость в желудке у собаки', 'можно ли собаке кости'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['inorodnoe-telo-pishevoda', 'gastrotomiya', 'divertikul-pishevoda'] },
  { slug: 'kishechnaya-neprohodimost', title: 'Кишечная непроходимость у собак и кошек: симптомы и лечение', query: 'непроходимость кишечника у собаки', more: ['непроходимость у кошки', 'собака не какает и рвёт'], intent: 'explain', rubric: 'urgent', priority: 1, ops: ['enterotomiya', 'rezekciya-kishechnika'] },
  { slug: 'vyzvat-rvotu-sobake', title: 'Можно ли вызывать рвоту, если собака что-то проглотила', query: 'как вызвать рвоту у собаки', more: ['перекись собаке', 'собака съела что-то опасное'], intent: 'decide', rubric: 'urgent', priority: 2, ops: ['gastrotomiya'] },
  { slug: 'zavorot-zheludka-u-sobak', title: 'Заворот желудка у собак: признаки, первая помощь, профилактика', query: 'заворот желудка у собаки', more: ['вздутие живота у собаки', 'собака пытается рвать', 'gdv'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['zavorot-zheludka', 'gastropeksiya'] },
  { slug: 'kormlenie-krupnoj-sobaki-zavorot', title: 'Как кормить крупную собаку, чтобы снизить риск заворота желудка', query: 'профилактика заворота желудка', more: ['можно ли гулять после еды собаке'], intent: 'howto', rubric: 'urgent', priority: 2, ops: ['gastropeksiya'] },
  { slug: 'vysotnyj-sindrom-u-koshek', title: 'Кошка выпала из окна: что делать в первые часы', query: 'кошка выпала из окна', more: ['высотный синдром у кошек', 'кошка упала с балкона'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['diafragmalnaya-gryzha', 'osteosintez', 'plastika-tverdogo-neba', 'osteosintez-chelyusti', 'drenazh-grudnoj-polosti'] },
  { slug: 'sobaku-sbila-mashina', title: 'Собаку сбила машина: первая помощь и что проверить у врача', query: 'собаку сбила машина', more: ['что делать если сбили собаку'], intent: 'symptom', rubric: 'urgent', priority: 2, ops: ['osteosintez', 'diafragmalnaya-gryzha', 'fiksaciya-vyviha-tbs'] },
  { slug: 'pokusala-sobaka', title: 'Собаку покусала другая собака: первая помощь и когда к врачу', query: 'собаку покусала собака что делать', more: ['укус у собаки', 'рана у собаки'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['pervichnaya-obrabotka-rany', 'ushivanie-ran'] },
  { slug: 'kak-ostanovit-krov', title: 'Как остановить кровь у собаки или кошки при порезе', query: 'как остановить кровь у собаки', more: ['порезала лапу собака'], intent: 'howto', rubric: 'urgent', priority: 2, ops: ['pervichnaya-obrabotka-rany'] },
  { slug: 'koshka-ne-est', title: 'Кошка не ест: когда это опасно и что такое липидоз печени', query: 'кошка не ест', more: ['кошка ничего не ест несколько дней'], intent: 'symptom', rubric: 'urgent', priority: 1, ops: ['ezofagostoma'] },
  { slug: 'krov-iz-nosa', title: 'Кровь из носа у собаки или кошки: возможные причины', query: 'кровь из носа у собаки', more: ['кровь из носа у кошки', 'собака чихает кровью'], intent: 'symptom', rubric: 'urgent', priority: 2, ops: ['rinotomiya'] },

  // --- Стерилизация и кастрация
  { slug: 'sterilizaciya-koshki', title: 'Стерилизация кошки: когда делать, как подготовить и чего ожидать', query: 'стерилизация кошки', more: ['в каком возрасте стерилизовать кошку', 'стерилизация кошки плюсы и минусы'], intent: 'decide', rubric: 'neuter', priority: 1, ops: ['sterilizaciya'] },
  { slug: 'uhod-posle-sterilizacii-koshki', title: 'Кошка после стерилизации: уход по дням', query: 'уход за кошкой после стерилизации', more: ['кошка после стерилизации', 'сколько носить попону после стерилизации'], intent: 'howto', rubric: 'neuter', priority: 1, ops: ['sterilizaciya'] },
  { slug: 'sterilizaciya-sobaki', title: 'Стерилизация собаки: возраст, плюсы и минусы', query: 'стерилизация собаки', more: ['когда стерилизовать собаку', 'стерилизация суки'], intent: 'decide', rubric: 'neuter', priority: 1, ops: ['sterilizaciya'] },
  { slug: 'uhod-posle-sterilizacii-sobaki', title: 'Собака после стерилизации: уход и восстановление', query: 'уход за собакой после стерилизации', more: ['собака после стерилизации'], intent: 'howto', rubric: 'neuter', priority: 1, ops: ['sterilizaciya'] },
  { slug: 'mify-o-sterilizacii', title: 'Мифы о стерилизации: «надо родить один раз» и другие', query: 'нужно ли кошке родить перед стерилизацией', more: ['стерилизация вредно ли'], intent: 'decide', rubric: 'neuter', priority: 2, ops: ['sterilizaciya'] },
  { slug: 'kastraciya-kota', title: 'Кастрация кота: в каком возрасте и как подготовить', query: 'кастрация кота', more: ['когда кастрировать кота', 'кот метит'], intent: 'decide', rubric: 'neuter', priority: 1, ops: ['kastraciya-kota'] },
  { slug: 'kot-posle-kastracii', title: 'Кот после кастрации: уход, питание, поведение', query: 'кот после кастрации', more: ['чем кормить кастрированного кота'], intent: 'howto', rubric: 'neuter', priority: 1, ops: ['kastraciya-kota'] },
  { slug: 'kastraciya-kobelya', title: 'Кастрация кобеля: плюсы, минусы и правильные сроки', query: 'кастрация собаки', more: ['кастрировать кобеля или нет'], intent: 'decide', rubric: 'neuter', priority: 1, ops: ['kastraciya-sobaki', 'skrotumektomiya'] },
  { slug: 'kriptorhizm', title: 'Крипторхизм у котов и собак: почему важно удалить семенник', query: 'крипторхизм у кота', more: ['одно яичко у собаки'], intent: 'explain', rubric: 'neuter', priority: 2, ops: ['kriptorhizm', 'udalenie-opuholi-semennika'] },
  { slug: 'techka-posle-sterilizacii', title: 'Течка после стерилизации: почему так бывает', query: 'течка после стерилизации', more: ['синдром остатка яичника'], intent: 'explain', rubric: 'neuter', priority: 2, ops: ['abscess-kulti'] },
  { slug: 'kastraciya-horka', title: 'Кастрация хорька: зачем и когда', query: 'кастрация хорька', more: [], intent: 'decide', rubric: 'neuter', priority: 3, ops: ['kastraciya-horka'] },

  // --- Подготовка и восстановление
  { slug: 'narkoz-u-sobak-i-koshek', title: 'Наркоз у собак и кошек: насколько опасен и как подготовиться', query: 'наркоз для собаки опасно', more: ['наркоз кошке', 'анализы перед наркозом'], intent: 'decide', rubric: 'care', priority: 1, ops: ['anesteziya', 'serdechno-legochnaya-reanimaciya'] },
  { slug: 'narkoz-pozhiloj-sobake', title: 'Наркоз пожилой собаке или кошке: что учитывает врач', query: 'наркоз старой собаке', more: ['операция пожилой кошке'], intent: 'decide', rubric: 'care', priority: 2, ops: ['anesteziya'] },
  { slug: 'kak-obrabatyvat-shov', title: 'Как обрабатывать шов после операции у собаки и кошки', query: 'как обрабатывать шов после операции у собаки', more: ['шов после стерилизации', 'шов покраснел'], intent: 'howto', rubric: 'care', priority: 1, ops: ['perevyazki'] },
  { slug: 'vorotnik-ili-popona', title: 'Воротник или попона после операции: что выбрать', query: 'воротник или попона после операции', more: [], intent: 'howto', rubric: 'care', priority: 2, ops: ['perevyazki', 'sterilizaciya'] },
  { slug: 'shishka-pod-shvom', title: 'Шишка под швом после операции: серома или осложнение', query: 'шишка под швом у собаки', more: ['уплотнение на шве после стерилизации'], intent: 'symptom', rubric: 'care', priority: 2, ops: ['aspiraciya-seromy'] },
  { slug: 'nuzhno-li-udalyat-plastinu', title: 'Нужно ли удалять пластину после перелома', query: 'удалять ли пластину после перелома у собаки', more: [], intent: 'decide', rubric: 'care', priority: 3, ops: ['udalenie-metallokonstrukcij'] },
  { slug: 'sitologiya-i-gistologiya', title: 'Цитология и гистология опухоли: в чём разница и зачем обе', query: 'гистология опухоли у собаки', more: ['цитология у собаки'], intent: 'explain', rubric: 'care', priority: 2, ops: ['otkrytaya-biopsiya'] },

  // --- Опухоли
  { slug: 'opuhol-molochnoj-zhelezy-u-sobaki', title: 'Опухоль молочной железы у собаки: что делать', query: 'опухоль молочной железы у собаки', more: ['шишка на соске у собаки'], intent: 'symptom', rubric: 'onco', priority: 1, ops: ['mastektomiya', 'lampektomiya'] },
  { slug: 'opuhol-molochnoj-zhelezy-u-koshki', title: 'Опухоль молочной железы у кошки: почему нельзя ждать', query: 'опухоль молочной железы у кошки', more: ['шишка на животе у кошки'], intent: 'symptom', rubric: 'onco', priority: 1, ops: ['mastektomiya'] },
  { slug: 'shishka-na-kozhe-u-sobaki', title: 'Шишка на коже у собаки: когда беспокоиться', query: 'шишка у собаки на коже', more: ['опухоль на коже у собаки', 'новообразование у собаки'], intent: 'symptom', rubric: 'onco', priority: 1, ops: ['udalenie-opuholej-kozhi', 'udalenie-lipomy'] },
  { slug: 'lipoma-u-sobaki', title: 'Жировик (липома) у собаки: удалять или наблюдать', query: 'жировик у собаки', more: ['липома у собаки'], intent: 'decide', rubric: 'onco', priority: 1, ops: ['udalenie-lipomy'] },
  { slug: 'mastocitoma', title: 'Мастоцитома у собак: что важно знать владельцу', query: 'мастоцитома у собаки', more: [], intent: 'explain', rubric: 'onco', priority: 2, ops: ['udalenie-opuholej-kozhi'] },
  { slug: 'papillomy-u-sobak', title: 'Бородавки и папилломы у собак: что делать', query: 'папиллома у собаки', more: ['бородавки у собаки'], intent: 'decide', rubric: 'onco', priority: 2, ops: ['mnozhestvennye-opuholi-kozhi'] },
  { slug: 'shishka-posle-privivki-u-koshki', title: 'Шишка после прививки у кошки: когда это опасно', query: 'шишка после прививки у кошки', more: ['саркома места инъекции'], intent: 'symptom', rubric: 'onco', priority: 2, ops: ['opuhol-myagkih-tkanej'] },
  { slug: 'opuhol-selezenki', title: 'Опухоль селезёнки у собаки: симптомы и прогноз', query: 'опухоль селезенки у собаки', more: ['гемангиосаркома у собак'], intent: 'explain', rubric: 'onco', priority: 2, ops: ['splenektomiya'] },
  { slug: 'opuhol-vo-rtu-u-sobaki', title: 'Опухоль во рту у собаки: эпулис и другие образования', query: 'опухоль во рту у собаки', more: ['нарост на десне у собаки'], intent: 'symptom', rubric: 'onco', priority: 2, ops: ['opuhol-rotovoj-polosti'] },
  { slug: 'shishka-u-anusa-kobelya', title: 'Шишка около ануса у кобеля: что это может быть', query: 'шишка возле ануса у собаки', more: ['перианальная аденома'], intent: 'symptom', rubric: 'onco', priority: 2, ops: ['opuhol-perianalnyh-zhelez'] },
  { slug: 'opuh-palec-u-sobaki', title: 'Опух палец у собаки: инфекция или опухоль', query: 'опух палец у собаки', more: ['коготь выпал у собаки'], intent: 'symptom', rubric: 'onco', priority: 2, ops: ['amputaciya-palca'] },
  { slug: 'sindrom-kushinga', title: 'Синдром Кушинга у собак: симптомы и когда нужна операция', query: 'синдром кушинга у собак', more: [], intent: 'explain', rubric: 'onco', priority: 2, ops: ['adrenalektomiya'] },
  { slug: 'opuhol-pecheni', title: 'Опухоль печени у собаки: какие бывают и как лечат', query: 'опухоль печени у собаки', more: [], intent: 'explain', rubric: 'onco', priority: 3, ops: ['lobektomiya-pecheni'] },
  { slug: 'uvelichen-limfouzel', title: 'Увеличен лимфоузел у собаки: возможные причины', query: 'увеличен лимфоузел у собаки', more: [], intent: 'symptom', rubric: 'onco', priority: 3, ops: ['limfadenektomiya'] },
  { slug: 'opuhol-yaichka', title: 'Опухоль яичка у собаки: признаки и лечение', query: 'опухоль яичка у собаки', more: [], intent: 'explain', rubric: 'onco', priority: 3, ops: ['udalenie-opuholi-semennika'] },
  { slug: 'osteosarkoma', title: 'Остеосаркома у собак: симптомы и варианты лечения', query: 'остеосаркома у собак', more: [], intent: 'explain', rubric: 'onco', priority: 2, ops: ['amputaciya-konechnosti'] },
  { slug: 'zhizn-na-treh-lapah', title: 'Как собаки и кошки живут на трёх лапах', query: 'собака на трех лапах', more: ['ампутация лапы у собаки'], intent: 'decide', rubric: 'onco', priority: 2, ops: ['amputaciya-konechnosti'] },

  // --- Травмы и ортопедия
  { slug: 'perelom-lapy', title: 'Перелом лапы у собаки или кошки: первая помощь и лечение', query: 'перелом лапы у собаки', more: ['перелом лапы у кошки'], intent: 'symptom', rubric: 'ortho', priority: 1, ops: ['osteosintez'] },
  { slug: 'skolko-sraschivaetsya-perelom', title: 'Сколько срастается перелом у собак и кошек', query: 'сколько срастается перелом у собаки', more: [], intent: 'explain', rubric: 'ortho', priority: 2, ops: ['osteosintez'] },
  { slug: 'sobaka-hromaet-na-zadnyuyu-lapu', title: 'Собака хромает на заднюю лапу: причины и что делать', query: 'собака хромает на заднюю лапу', more: ['собака поджимает лапу'], intent: 'symptom', rubric: 'ortho', priority: 1, ops: ['plastika-svyazki', 'rezekciya-golovki-bedra', 'fiksaciya-vyviha-tbs'] },
  { slug: 'razryv-krestoobraznoj-svyazki', title: 'Разрыв крестообразной связки у собак', query: 'разрыв крестообразной связки у собаки', more: ['пкс у собаки'], intent: 'explain', rubric: 'ortho', priority: 1, ops: ['protezirovanie-svyazki', 'plastika-svyazki'] },
  { slug: 'displaziya-tazobedrennyh', title: 'Дисплазия тазобедренных суставов у собак', query: 'дисплазия тазобедренных суставов у собак', more: [], intent: 'explain', rubric: 'ortho', priority: 1, ops: ['rezekciya-golovki-bedra'] },
  { slug: 'legg-kalve-perthes', title: 'Болезнь Легга — Кальве — Пертеса у мелких собак', query: 'болезнь легга кальве пертеса у собак', more: [], intent: 'explain', rubric: 'ortho', priority: 2, ops: ['rezekciya-golovki-bedra'] },
  { slug: 'vyvih-bedra', title: 'Вывих бедра у собаки или кошки: что делать', query: 'вывих бедра у собаки', more: [], intent: 'symptom', rubric: 'ortho', priority: 2, ops: ['fiksaciya-vyviha-tbs'] },
  { slug: 'perelom-chelyusti-u-koshki', title: 'Перелом челюсти у кошки после падения', query: 'перелом челюсти у кошки', more: [], intent: 'symptom', rubric: 'ortho', priority: 3, ops: ['osteosintez-chelyusti'] },
  { slug: 'travma-hvosta', title: 'Травма хвоста у собаки и кошки: что делать', query: 'сломан хвост у кошки', more: ['хвост не двигается у кошки'], intent: 'symptom', rubric: 'ortho', priority: 3, ops: ['amputaciya-hvosta'] },
  { slug: 'giperekstenziya-zapyastya', title: 'Собака «провалилась» на запястье: гиперэкстензия', query: 'гиперэкстензия запястья у собаки', more: [], intent: 'explain', rubric: 'ortho', priority: 3, ops: ['artrodez'] },

  // --- Мочевыделительная система
  { slug: 'mochekamennaya-bolezn-u-kotov', title: 'Мочекаменная болезнь у котов: симптомы, лечение, профилактика', query: 'мочекаменная болезнь у кота', more: ['мкб у кота', 'кот писает с кровью'], intent: 'explain', rubric: 'uro', priority: 1, ops: ['uretrostomiya', 'cistotomiya'] },
  { slug: 'zhizn-posle-uretrostomii', title: 'Жизнь кота после уретростомии', query: 'кот после уретростомии', more: [], intent: 'howto', rubric: 'uro', priority: 2, ops: ['uretrostomiya'] },
  { slug: 'kamni-v-mochevom-puzyre', title: 'Камни в мочевом пузыре у собаки: растворять или оперировать', query: 'камни в мочевом пузыре у собаки', more: [], intent: 'decide', rubric: 'uro', priority: 1, ops: ['cistotomiya'] },
  { slug: 'krov-v-moche', title: 'Кровь в моче у собаки или кошки: возможные причины', query: 'кровь в моче у собаки', more: ['кровь в моче у кошки'], intent: 'symptom', rubric: 'uro', priority: 1, ops: ['cistotomiya'] },
  { slug: 'kamni-v-mochetochnike', title: 'Камень в мочеточнике у кошки', query: 'камень в мочеточнике у кошки', more: [], intent: 'explain', rubric: 'uro', priority: 3, ops: ['ureterotomiya'] },
  { slug: 'gidronefroz', title: 'Гидронефроз у собак и кошек', query: 'гидронефроз у кошки', more: [], intent: 'explain', rubric: 'uro', priority: 3, ops: ['nefrektomiya'] },

  // --- Беременность и роды
  { slug: 'pyometra-u-sobak', title: 'Пиометра у собак: симптомы, лечение и профилактика', query: 'пиометра у собаки', more: ['гной из петли у собаки'], intent: 'symptom', rubric: 'repro', priority: 1, ops: ['piometra'] },
  { slug: 'pyometra-u-koshek', title: 'Пиометра у кошек: как распознать', query: 'пиометра у кошки', more: [], intent: 'symptom', rubric: 'repro', priority: 2, ops: ['piometra'] },
  { slug: 'rody-u-sobaki', title: 'Роды у собаки: когда нужна помощь врача', query: 'роды у собаки', more: ['собака не может родить'], intent: 'symptom', rubric: 'repro', priority: 1, ops: ['kesarevo-sechenie'] },
  { slug: 'rody-u-koshki', title: 'Роды у кошки: признаки проблем', query: 'кошка не может родить', more: ['роды у кошки'], intent: 'symptom', rubric: 'repro', priority: 1, ops: ['kesarevo-sechenie'] },
  { slug: 'promezhnostnaya-gryzha', title: 'Промежностная грыжа у кобелей: почему возникает и как лечат', query: 'промежностная грыжа у собаки', more: [], intent: 'explain', rubric: 'repro', priority: 2, ops: ['promezhnostnaya-gryzha'] },
  { slug: 'vypadenie-vlagalischa', title: 'Выпадение влагалища у собаки во время течки', query: 'выпадение влагалища у собаки', more: [], intent: 'symptom', rubric: 'repro', priority: 3, ops: ['prolaps-vlagalishha'] },

  // --- Кожа, раны, уши
  { slug: 'abscess-u-koshki', title: 'Абсцесс у кошки после драки: что делать', query: 'абсцесс у кошки', more: ['нарыв у кошки'], intent: 'symptom', rubric: 'skin', priority: 1, ops: ['vskrytie-abscessa'] },
  { slug: 'gematoma-uha', title: 'Гематома уха у собаки: почему опухло ухо и как лечат', query: 'гематома уха у собаки', more: ['опухло ухо у собаки', 'ухо как подушка'], intent: 'symptom', rubric: 'skin', priority: 1, ops: ['gematoma-ushnoj-rakoviny'] },
  { slug: 'hronicheskij-otit', title: 'Хронический отит у собаки: когда нужна операция', query: 'хронический отит у собаки', more: [], intent: 'decide', rubric: 'skin', priority: 2, ops: ['rasshirenie-sluhovogo-prohoda'] },
  { slug: 'skladki-u-mopsa', title: 'Воспаление складок у мопса и бульдога: уход и лечение', query: 'складка на носу у мопса воспалилась', more: [], intent: 'howto', rubric: 'skin', priority: 2, ops: ['plastika-nosogubnoj-skladki'] },
  { slug: 'shishka-na-shee', title: 'Шишка на шее у собаки под челюстью: что это может быть', query: 'шишка на шее у собаки', more: [], intent: 'symptom', rubric: 'skin', priority: 2, ops: ['kista-slyunnoj-zhelezy'] },
  { slug: 'pupochnaya-gryzha', title: 'Пупочная грыжа у щенка и котёнка: нужна ли операция', query: 'пупочная грыжа у щенка', more: ['грыжа у котенка'], intent: 'decide', rubric: 'skin', priority: 1, ops: ['pupochnaya-gryzha'] },
  { slug: 'pahovaya-gryzha', title: 'Паховая грыжа у собаки: симптомы и лечение', query: 'паховая грыжа у собаки', more: [], intent: 'explain', rubric: 'skin', priority: 2, ops: ['pahovaya-gryzha'] },
  { slug: 'vypadenie-pryamoj-kishki', title: 'Выпадение прямой кишки у котёнка или щенка', query: 'выпала прямая кишка у котенка', more: [], intent: 'symptom', rubric: 'urgent', priority: 2, ops: ['vypadenie-pryamoj-kishki'] },
  { slug: 'volchya-past', title: 'Волчья пасть у щенка и котёнка: что делать', query: 'волчья пасть у щенка', more: [], intent: 'explain', rubric: 'skin', priority: 3, ops: ['plastika-tverdogo-neba'] },
  // --- Нишевые темы, чтобы у каждой позиции прайса была статья
  { slug: 'kotenok-ne-kakaet', title: 'Котёнок или щенок не какает: когда срочно к врачу', query: 'котенок не какает', more: ['щенок не какает'], intent: 'symptom', rubric: 'urgent', priority: 2, ops: ['atreziya-anusa', 'enterotomiya'] },
  { slug: 'pankreatit-u-sobak', title: 'Панкреатит у собак: когда нужна операция', query: 'панкреатит у собаки', more: [], intent: 'explain', rubric: 'urgent', priority: 3, ops: ['abscess-podzheludochnoj-zhelezy'] },
  { slug: 'zhidkost-v-zhivote', title: 'Жидкость в животе у собаки: возможные причины', query: 'жидкость в животе у собаки', more: ['асцит у собаки'], intent: 'symptom', rubric: 'urgent', priority: 3, ops: ['diagnosticheskaya-laparotomiya', 'drenazh-bryushnoj-polosti'] },
  { slug: 'gryzha-posle-operacii', title: 'Грыжа на животе у собаки после травмы или операции', query: 'грыжа на животе у собаки', more: [], intent: 'explain', rubric: 'skin', priority: 3, ops: ['plastika-bryushnoj-stenki'] },
  { slug: 'bolshie-rany', title: 'Большие раны у собак и кошек: как их закрывают', query: 'большая рана у собаки', more: ['пластика кожи у собаки'], intent: 'explain', rubric: 'skin', priority: 3, ops: ['plastika-kozhi', 'nekrektomiya', 'udalenie-opuholi-s-plastikoj', 'ushivanie-ran'] },
  { slug: 'zachem-drenazh', title: 'Зачем ставят дренаж после операции и как за ним ухаживать', query: 'дренаж у собаки после операции', more: [], intent: 'howto', rubric: 'care', priority: 3, ops: ['drenirovanie-rany', 'drenazh-bryushnoj-polosti', 'drenazh-grudnoj-polosti'] },
  { slug: 'otryv-bugristosti', title: 'Отрывной перелом у щенка: почему кость ломается у связки', query: 'отрыв бугристости большеберцовой кости у щенка', more: [], intent: 'explain', rubric: 'ortho', priority: 3, ops: ['avulsionnyj-perelom', 'vnutrisustavnoj-perelom'] },
  { slug: 'utoplennaya-petlya', title: '«Утопленная» петля и частые циститы у суки', query: 'утопленная петля у собаки', more: [], intent: 'explain', rubric: 'repro', priority: 3, ops: ['plastika-vlagalishhnoj-skladki'] },
  { slug: 'opuhol-vo-vlagalische', title: 'Образование во влагалище у собаки: что это может быть', query: 'опухоль во влагалище у собаки', more: [], intent: 'symptom', rubric: 'repro', priority: 3, ops: ['epiziotomiya'] },
];

module.exports = { RUBRICS, PLAN };
