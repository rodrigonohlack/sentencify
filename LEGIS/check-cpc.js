const j = require('./cpc.json');

// 40 artigos importantes do CPC
const artigosChave = [
  '1', '17', '21', '42', '70', '98', '139', '190', '219', '294',
  '300', '319', '330', '337', '355', '373', '485', '489', '496', '523',
  '525', '674', '700', '771', '831', '926', '966', '985', '1015', '1026',
  '1000', '1001', '1009', '1022', '1035', '1040', '1045', '1070', '1071', '1072'
];

console.log('=== VERIFICAÇÃO DE 30 ARTIGOS DO CPC ===\n');

let problemas = 0;
for (const num of artigosChave) {
  const art = j.find(x => x.numero === num);
  if (!art) {
    console.log('❌ Art. ' + num + ': NÃO ENCONTRADO');
    problemas++;
    continue;
  }

  const caputOk = art.caput && art.caput.length > 10;
  const info = [];
  if (art.incisos.length > 0) info.push(art.incisos.length + ' inc');
  if (art.paragrafos.length > 0) info.push(art.paragrafos.length + ' §');
  if (art.alineas && art.alineas.length > 0) info.push(art.alineas.length + ' al');

  const status = caputOk ? '✅' : '⚠️';
  console.log(status + ' Art. ' + num + ': ' + (info.length ? info.join(', ') : 'só caput') + ' | "' + art.caput.substring(0, 55) + '..."');

  if (!caputOk) problemas++;
}

console.log('\n=== RESUMO ===');
console.log('Verificados: ' + artigosChave.length);
console.log('Problemas: ' + problemas);
