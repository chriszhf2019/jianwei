import { TerminologyDefinition } from '../types';

export const JARGON_DICTIONARY: Record<string, TerminologyDefinition> = {
  '鹰派': {
    term: '鹰派',
    category: '宏观财经 / 央行政策',
    simpleExplain: '更倾向于控制通货膨胀、抑制经济过热、倾向于维持较高利率或收紧货币政策。',
    metaphor: '就像开车时发现车速过快，老司机习惯性轻踩刹车，宁可慢一点也要防止失控。',
    oppositeTerm: '鸽派',
    oppositeExplain: '更倾向于降息刺激经济增长、容忍轻微通胀、向市场注水。',
    memoryRule: '鹰派 → 控通胀抓刹车；鸽派 → 促增长猛踩油门。',
    exampleContext: '美联储声明措辞偏鹰，意味着高利率可能维持更久，借钱成本短期下不来。'
  },
  '鸽派': {
    term: '鸽派',
    category: '宏观财经 / 央行政策',
    simpleExplain: '更倾向于降低利率、增加货币供应，以刺激就业和实体经济繁荣。',
    metaphor: '就像天旱了给农田开闸放水，希望庄稼快点长，暂时不管会不会长杂草。',
    oppositeTerm: '鹰派',
    oppositeExplain: '更倾向于控通胀、收紧流动性。',
    memoryRule: '鸽子温和喜放水，利好股票与黄金。',
    exampleContext: '市场预期转向鸽派，全球风险资产往往应声上涨。'
  },
  'CPO光电共封装': {
    term: 'CPO光电共封装',
    category: '前沿芯片与硬件',
    simpleExplain: '把传输光信号的光学引擎和计算芯片直接封装打包在一起，大幅缩短传输距离，省电且速度暴增。',
    metaphor: '以前送外卖要骑电动车穿过三条街（传统铜线发热大），现在直接把厨房搬到餐厅包厢隔壁（光电合体零延迟）。',
    memoryRule: '光电直接抱在一起，算力发热立减三成。',
    exampleContext: '单芯片功耗突破千瓦后，光电共封装成为算力集群不被烧坏的必由之路。'
  },
  '公差': {
    term: '晶圆公差 / 制造公差',
    category: '半导体精密制造',
    simpleExplain: '实际制造出来的零件尺寸与设计标准之间允许存在的极微小误差范围。',
    metaphor: '做西装时师傅允许袖口多或少 1 毫米；而在纳米芯片上，公差小到几颗原子的宽度。',
    memoryRule: '公差越小 = 工艺越极致 = 良品率越高。',
    exampleContext: '代工厂从“研发公差”转为“量产公差”，说明实验室技术终于可以大规模赚钱了。'
  },
  '逆向本土化': {
    term: '逆向本土化 / 逆向出海',
    category: '国际贸易与制造业',
    simpleExplain: '企业不再直接把国内造好的整机卖到国外，而是把核心零配件、生产线和技术标准带去海外当地合资组装。',
    metaphor: '以前直接卖做好的老干妈，现在直接把独家辣椒油配方带去国外开厂雇佣当地工人装瓶。',
    memoryRule: '不撞关税墙，化整为零扎根当地。',
    exampleContext: '中国车企通过散件出口和本地合资建厂，把关税壁垒转化为当地政策补贴。'
  },
  'CKD散件': {
    term: 'CKD (Completely Knocked Down) 全散装件',
    category: '汽车与供应链',
    simpleExplain: '将整车拆解成数百个独立的零部件散件出口，运到目的地国家后再由当地工人拼装成整车。',
    metaphor: '像宜家家具一样，不运大衣柜，而是运一箱箱板材螺丝到你家里组装。',
    memoryRule: '散件运过去，税率低一半，当地赚就业。',
    exampleContext: 'CKD散件出口激增，反映出中国供应链正在从整车出口升级为体系出海。'
  },
  '期限错配': {
    term: '期限错配',
    category: '金融与风险管理',
    simpleExplain: '机构用短期借来的钱去投资长期的项目（例如借 3 个月的债去买 10 年期的楼）。',
    metaphor: '拿每个月的花呗和信用卡去还 30 年的房贷，一旦某个月借不到新钱就会瞬间断粮。',
    memoryRule: '短钱投长钱，最怕流动性突然断流。',
    exampleContext: '非银金融机构期限错配指标攀升，警示潜在的流动性挤兑风险。'
  },
  'AI Agent': {
    term: 'AI Agent (人工智能智能体)',
    category: '人工智能前沿',
    simpleExplain: '具有自主感知、规划决策、调用工具并自动完成端到端复杂任务的独立 AI 系统。',
    metaphor: '普通 AI 是个“百科全书”（你问它答），AI Agent 是你的“超级私人秘书”（告诉它目标，它自己订机票定酒店写报告）。',
    memoryRule: '从“能回答问题”进化到“能把事情办成”。',
    exampleContext: '新一代模型的核心突破不是回答更长，而是让 AI Agent 能自主操作数十步复杂业务系统。'
  },
  '工作流自动化': {
    term: '工作流自动化',
    category: '人工智能与企业软件',
    simpleExplain: '把过去需要人工一步步点击完成的重复业务流程（录入、审批、报表、派单等）交给软件或 AI Agent 自动串联完成。',
    metaphor: '以前流水线上每个工位都要一位工人弯腰捡件，现在传送带和机械手自动把半成品送到下一站，工人只管质检。',
    memoryRule: '把“人肉搬运”变成“自动化传送带”。',
    exampleContext: 'SaaS 商业模式从按账号收费转向按任务结果收费，背后的推手正是端到端的工作流自动化。'
  }
};
