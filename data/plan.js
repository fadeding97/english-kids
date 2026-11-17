/* 每周计划（原创内容）
   每周：主题、封面字、配色、要接触的词、家长重点、每天一句（7 句，一天一句）、
   每天 3 件事用到的资源（song / book / play，按天轮换），以及每类任务的「家长怎么陪」。
   目前手写了 12–18 个月（s1）的 8 周；其他月龄由页面按阶段自动生成通用安排。 */
const PLAN_WEEKS = {
  s1: [
    {
      theme: '你好和再见', en: 'Hello & Bye-bye', cover: 'Hi!', color: '#F7A541',
      words: ['hello', 'bye-bye', 'mommy', 'daddy', 'baby', 'good night'],
      focus: '进门、出门、睡觉前都说 Hello / Bye-bye / Good night，配上挥手。',
      phrases: [['Hello!', '早上见到宝宝时'], ['Bye-bye!', '出门、挂电话时挥手说'], ['Good morning!', '起床拉开窗帘时'], ['Good night!', '关灯睡觉前'], ['Where’s Mommy?', '躲猫猫时'], ['Here you are!', '递东西给宝宝时'], ['Thank you!', '宝宝递东西给你时']],
      song: ['Super Simple Songs', 'Mother Goose Club', 'Little Baby Bum'],
      book: ['Where’s Spot?', 'Dear Zoo'],
      play: ['Peekaboo & Pat-a-cake', 'English Fingerplays'],
      tips: {
        song: '唱到 Hello、Bye-bye 时对着宝宝挥手，不用让宝宝开口。',
        book: '翻开每一页前先问 "Where is …?"，停两秒再揭晓。',
        play: '用毛巾挡住脸，拿开时说 "Peekaboo!"，宝宝笑就多玩几次。',
      },
    },
    {
      theme: '身体部位', en: 'Head & Toes', cover: 'Head', color: '#FF8FA3',
      words: ['head', 'nose', 'eyes', 'mouth', 'tummy', 'toes'],
      focus: '洗澡、穿衣时边摸边说 "This is your nose!"',
      phrases: [['Touch your nose!', '洗脸时'], ['Where’s your tummy?', '换尿布时'], ['Clap your hands!', '听儿歌时'], ['Wiggle your toes!', '穿袜子时'], ['Wash your hands!', '吃饭前'], ['Big hug!', '抱宝宝时'], ['Open your mouth!', '喂饭时']],
      song: ['Super Simple Songs', 'Wee Sing Fingerplays', 'The Wiggles'],
      book: ['Brown Bear, Brown Bear', 'Dear Zoo'],
      play: ['English Fingerplays', 'Peekaboo & Pat-a-cake'],
      tips: {
        song: '唱到身体部位时，轻轻点宝宝对应的地方。',
        book: '看到动物时指着它的眼睛、鼻子说 "eyes""nose"。',
        play: '边做手指谣边摸宝宝的手指、脚趾，慢一点、多重复。',
      },
    },
    {
      theme: '动物叫声', en: 'Animal Sounds', cover: 'Moo!', color: '#6AA8FF',
      words: ['dog', 'cat', 'duck', 'cow', 'bear', 'bird'],
      focus: '看到动物（图片、玩偶、路上的小狗）就学叫声："The dog says woof!"',
      phrases: [['The dog says woof!', '看到小狗时'], ['What do you see?', '翻绘本时'], ['Quack quack!', '洗澡玩小黄鸭时'], ['Big bear!', '抱玩偶时'], ['Where’s the cat?', '找玩具时'], ['Moo!', '听儿歌时学牛叫'], ['Good dog!', '摸玩偶时']],
      song: ['Little Baby Bum', 'LooLoo Kids', 'Super Simple Songs'],
      book: ['Brown Bear, Brown Bear', 'Dear Zoo'],
      play: ['English Fingerplays', 'Peekaboo & Pat-a-cake'],
      tips: {
        song: '唱到动物时一起学叫声，夸张一点宝宝更爱听。',
        book: '读 "What do you see?" 后停一下，指着下一只动物等宝宝看。',
        play: '把玩偶藏在身后，拿出来时说 "It’s a dog! Woof!"',
      },
    },
    {
      theme: '吃饭时间', en: 'Yummy!', cover: 'Yummy!', color: '#FFB84D',
      words: ['eat', 'milk', 'water', 'apple', 'banana', 'all done'],
      focus: '每顿饭固定说 "Time to eat!" 开始、"All done!" 结束。',
      phrases: [['Time to eat!', '坐上餐椅时'], ['Yummy!', '宝宝吃得开心时'], ['All done!', '吃完收碗时'], ['More, please?', '宝宝还想吃时'], ['Drink some water.', '递水杯时'], ['Open wide!', '喂饭时'], ['Apple, please.', '递水果时']],
      song: ['Dave and Ava', 'Super Simple Songs', 'BabyBus English'],
      book: ['Where’s Spot?', 'Goodnight Moon'],
      play: ['Daily Routine English', 'Peekaboo & Pat-a-cake'],
      tips: {
        song: '吃饭前放一首，听到歌就知道要吃饭了，形成小仪式。',
        book: '读完说 "All done!" 合上书，和吃饭时用同一句话。',
        play: '吃饭时照着日常英语里的句子说，一顿饭说 2–3 句就够。',
      },
    },
    {
      theme: '洗澡和睡觉', en: 'Bath & Bed', cover: 'Bath', color: '#A78BFA',
      words: ['bath', 'water', 'bubbles', 'towel', 'bed', 'night night'],
      focus: '洗澡和睡前是最固定的时间，每天用同样的几句话。',
      phrases: [['Bath time!', '放洗澡水时'], ['Splash splash!', '玩水时'], ['Bubbles!', '吹泡泡时'], ['Dry you off.', '用毛巾擦干时'], ['Pajamas on.', '穿睡衣时'], ['Night night.', '关灯时'], ['I love you.', '睡前抱抱时']],
      song: ['English Lullabies', 'Super Simple Songs', 'Little Baby Bum'],
      book: ['Goodnight Moon', 'Where’s Spot?'],
      play: ['Daily Routine English', 'English Fingerplays'],
      tips: {
        song: '睡前把摇篮曲调小声，作为「要睡觉了」的信号。',
        book: '睡前读 Goodnight Moon，跟着书和房间里的东西说晚安。',
        play: '洗澡时照着日常英语说，宝宝会把这些句子和洗澡联系起来。',
      },
    },
    {
      theme: '颜色', en: 'Colors', cover: 'Red!', color: '#5ED47F',
      words: ['red', 'blue', 'yellow', 'green', 'ball', 'color'],
      focus: '每天挑一种颜色，看到就说："Red! A red ball!"',
      phrases: [['Red!', '看到红色玩具时'], ['A blue cup.', '递杯子时'], ['Yellow banana.', '吃香蕉时'], ['Green tree.', '出门看到树时'], ['What color?', '翻绘本时'], ['Pick the red one.', '收玩具时'], ['Pretty colors!', '画画时']],
      song: ['Super Simple Songs', 'ChuChu TV', 'Pinkfong Baby Shark'],
      book: ['Brown Bear, Brown Bear', 'Dear Zoo'],
      play: ['English Fingerplays', 'Peekaboo & Pat-a-cake'],
      tips: {
        song: '唱到颜色时，指一指身边同样颜色的东西。',
        book: 'Brown Bear 每一页都有颜色，读的时候把颜色词读重一点。',
        play: '拿两个不同颜色的球，说 "Red ball or blue ball?" 让宝宝选。',
      },
    },
    {
      theme: '数一数', en: 'One, Two, Three', cover: '1 2 3', color: '#F06BC8',
      words: ['one', 'two', 'three', 'more', 'ball', 'shoes'],
      focus: '上台阶、穿鞋、放积木时数 "One, two, three!"',
      phrases: [['One, two, three!', '上台阶时'], ['Two shoes.', '穿鞋时'], ['One more?', '还要不要时'], ['Let’s count!', '放积木时'], ['Three balls.', '玩球时'], ['Up we go!', '抱起宝宝时'], ['Ready, set, go!', '推小车时']],
      song: ['Super Simple Songs', 'Little Baby Bum', 'Mother Goose Club'],
      book: ['Dear Zoo', 'Where’s Spot?'],
      play: ['English Fingerplays', 'Peekaboo & Pat-a-cake'],
      tips: {
        song: '数数歌里每数一个，就轻点宝宝的手指一下。',
        book: '翻页前数 "One, two, three… open!"，宝宝会期待打开。',
        play: '躲猫猫前数 "One, two, three… peekaboo!"',
      },
    },
    {
      theme: '出门玩', en: 'Let’s Go Out', cover: 'Go!', color: '#4FD1E0',
      words: ['car', 'bus', 'go', 'stop', 'tree', 'sun'],
      focus: '出门散步时，看到什么说什么："Look, a bus!"',
      phrases: [['Let’s go!', '出门时'], ['Look, a bus!', '路上看到公交车时'], ['Stop!', '过马路停下时'], ['Big tree.', '公园里'], ['Hello, sun!', '晴天出门时'], ['Bye-bye, doggy!', '和路上的小狗告别'], ['Home now.', '回家时']],
      song: ['Super Simple Songs', 'LooLoo Kids', 'BabyBus English'],
      book: ['Where’s Spot?', 'Brown Bear, Brown Bear'],
      play: ['Daily Routine English', 'Peekaboo & Pat-a-cake'],
      tips: {
        song: 'The Wheels on the Bus 这类歌，带着宝宝一起做动作。',
        book: '读完带宝宝去窗边，找一找书里出现过的东西。',
        play: '散步时照着日常英语说，路上看到什么就说什么。',
      },
    },
  ],
};
const PLAN_FREE_WEEKS = 2;   // 前 2 周免费，之后需要会员
