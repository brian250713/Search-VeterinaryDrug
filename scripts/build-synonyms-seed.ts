import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const rawDataPath = path.join(projectRoot, 'data', 'raw.json');
const synonymsPath = path.join(projectRoot, 'data', 'synonyms.json');

const KNOWN_CHINESE_NAMES: Record<string, string> = {
  AMOXICILLIN: '阿莫西林',
  AMOXYCILLIN: '阿莫西林',
  TYLOSIN: '泰樂黴素',
  FLORFENICOL: '氟苯尼考',
  OXYTETRACYCLINE: '羥四環黴素',
  CHLORTETRACYCLINE: '氯四環黴素',
  TETRACYCLINE: '四環黴素',
  DOXYCYCLINE: '多西環素',
  LINCOMYCIN: '林可黴素',
  SPECTINOMYCIN: '觀黴素',
  CHLORAMPHENICOL: '氯黴素',
  AMPICILLIN: '安比西林',
  PENICILLIN: '盤尼西林',
  'PENICILLIN G PROCAINE': '普魯卡因青黴素G',
  KANAMYCIN: '卡那黴素',
  STREPTOMYCIN: '鏈黴素',
  NEOMYCIN: '新黴素',
  GENTAMICIN: '慶大黴素',
  GENTAMYCIN: '慶大黴素',
  COLISTIN: '可利斯汀',
  ENROFLOXACIN: '恩氟喹啉',
  CIPROFLOXACIN: '環丙沙星',
  NORFLOXACIN: '諾氟沙星',
  OFLOXACIN: '氧氟沙星',
  FLUMEQUINE: '氟甲喹',
  SULFAMETHAZINE: '磺胺二甲嘧啶',
  SULFADIMETHOXINE: '磺胺二甲氧嘧啶',
  SULFAMETHOXAZOLE: '磺胺甲㗁唑',
  SULFAQUINOXALINE: '磺胺喹㗁啉',
  SULFADIAZINE: '磺胺嘧啶',
  SULFATHIAZOLE: '磺胺噻唑',
  SULFAMONOMETHOXINE: '磺胺單甲氧嘧啶',
  TRIMETHOPRIM: '甲氧苄啶',
  TIAMULIN: '泰妙素',
  VALNEMULIN: '維拉妙素',
  TILMICOSIN: '替米考星',
  TULATHROMYCIN: '土拉黴素',
  CEFTIOFUR: '賽福妥',
  CEFALEXIN: '頭孢氨苄',
  CEPHALEXIN: '頭孢氨苄',
  IVERMECTIN: '伊維菌素',
  DORAMECTIN: '多拉菌素',
  ALBENDAZOLE: '阿苯達唑',
  FENBENDAZOLE: '芬苯達唑',
  LEVAMISOLE: '左旋咪唑',
  MEBENDAZOLE: '甲苯達唑',
  PRAZIQUANTEL: '吡喹酮',
  DICLAZURIL: '地克珠利',
  TOLTRAZURIL: '托曲珠利',
  AMPROLIUM: '安保寧',
  MADURAMICIN: '馬杜黴素',
  MONENSIN: '莫能菌素',
  SALINOMYCIN: '沙利黴素',
  LASALOCID: '拉沙里菌素',
  NOCARBAZIN: '尼卡巴嗪',
  NICARBAZIN: '尼卡巴嗪',
  CARBADOX: '卡巴多',
  OLAQUINDOX: '乙醯甲喹',
  SULPYRIN: '安乃近',
  METAMIZOLE: '安乃近',
  DIPYRONE: '安乃近',
  FLUNIXIN: '氟尼辛',
  MELOXICAM: '美洛昔康',
  CARPROFEN: '卡洛芬',
  KETOPROFEN: '酮洛芬',
  DEXAMETHASONE: '地塞米松',
  PREDNISOLONE: '培尼皮質醇',
  HYDROCORTISONE: '氫化皮質酮',
  ATROPINE: '阿托品',
  XYLAZINE: '塞拉嗪',
  KETAMINE: '氯胺酮',
  ZOLETIL: '佐力妥',
  DIAZEPAM: '地西泮',
  FUROSEMIDE: '呋喃苯胺酸',
  'VITAMIN A': '維生素A',
  'VITAMIN D3': '維生素D3',
  'VITAMIN E': '維生素E',
  'VITAMIN K': '維生素K',
  'VITAMIN K3': '維生素K3',
  'VITAMIN B1': '維生素B1',
  'VITAMIN B2': '維生素B2',
  'VITAMIN B6': '維生素B6',
  'VITAMIN B12': '維生素B12',
  'VITAMIN C': '維生素C',
  NICOTINAMIDE: '菸鹼醯胺',
  'NICOTINIC ACID': '菸鹼酸',
  'FOLIC ACID': '葉酸',
  BIOTIN: '生物素',
  INOSITOL: '肌醇',
  'PANTOTHENIC ACID': '泛酸',
  'CAL. PANTOTHENATE': '泛酸鈣',
  'CALCIUM PANTOTHENATE': '泛酸鈣',
  'CHOLINE CHLORIDE': '氯化膽鹼',
  'DL-METHIONINE': '甲硫胺酸',
  METHIONINE: '甲硫胺酸',
  'L-LYSINE': '離胺酸',
  LYSINE: '離胺酸',
  IRON: '鐵',
  COPPER: '銅',
  ZINC: '鋅',
  MANGANESE: '錳',
  COBALT: '鈷',
  IODINE: '碘',
  SELENIUM: '硒',
  'CLAVULANIC ACID': '克拉維酸',
  METRONIDAZOLE: '甲硝唑',
  DIMETRIDAZOLE: '二甲硝咪唑',
  RONIDAZOLE: '羅硝唑',
};

const ALIAS_MAP: Record<string, string> = {
  AMOXYCILLIN: 'AMOXICILLIN',
  CEPHALEXIN: 'CEFALEXIN',
  GENTAMYCIN: 'GENTAMICIN',
  DIPYRONE: 'SULPYRIN',
  METAMIZOLE: 'SULPYRIN',
  'CAL. PANTOTHENATE': 'CALCIUM PANTOTHENATE',
};

function main() {
  if (!fs.existsSync(rawDataPath)) {
    console.error('raw.json not found');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
  const counts: Record<string, number> = {};

  const prefixRegex =
    /^(?:EACH\s+\S+\s+CONTAINS[:：]?|EACH\s+CONTAINS[:：]?|EACH\s*[:：]|每\S+含(?:有)?[:：]?|COMPOSITION[:：]?|INGREDIENTS?[:：]?)/i;
  const saltRegex =
    /\b(?:TRIHYDRATE|HYDROCHLORIDE|HCL|SULFATE|SULPHATE|SODIUM|POTASSIUM|TARTRATE|HYCLATE|FUMARATE|PHOSPHATE|PROPIONATE|ACETATE|NITRATE|MESYLATE|CITRATE|MALEATE|SUCCINATE|DISODIUM|MONOHYDRATE|DIHYDRATE|CALCIUM|ZINC|BASE)\b/g;

  for (const d of raw) {
    if (d['劑型'] && d['劑型'].includes('生物製劑')) continue;
    const text = String(d['成分'] || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:div|p)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .toUpperCase();

    const lines = text.split(/[\n;；]+/);
    for (const line of lines) {
      let s = line.trim();
      if (!s) continue;
      s = s.replace(prefixRegex, '').trim();
      s = s.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
      s = s.replace(/\s+\d+(?:\.\d+)?\s*(?:MG|GM|G|KG|ML|IU|%|W\/V%|MCG|UG|PPM).*/i, '');
      s = s.replace(/\d+(?:\.\d+)?\s*(?:MG|GM|G|KG|ML|IU|%|MCG|UG).*/i, '');
      s = s.replace(saltRegex, '').trim();
      s = s.replace(/[\s\.\:\,\-]+$/, '').trim();

      if (s.length >= 3 && /^[A-Z]/.test(s) && !s.startsWith('EACH')) {
        const canonical = ALIAS_MAP[s] || s;
        counts[canonical] = (counts[canonical] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log(`Unique base ingredients found: ${sorted.length}`);

  // Take top 220
  const topList = sorted.slice(0, 220);

  const synonymsList = topList.map(([name, count]) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const chineseName = KNOWN_CHINESE_NAMES[name] || '';
    const aliases: string[] = [];

    // Find known aliases
    for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
      if (canonical === name) {
        aliases.push(alias);
      }
    }

    return {
      slug,
      name,
      chineseName,
      aliases,
      verified: true,
      sampleCount: count,
    };
  });

  fs.writeFileSync(synonymsPath, JSON.stringify(synonymsList, null, 2), 'utf8');
  console.log(`Wrote ${synonymsList.length} synonyms to ${synonymsPath}`);
}

main();
