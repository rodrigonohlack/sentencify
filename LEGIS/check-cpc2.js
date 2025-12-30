const j = require('./cpc.json');

// Mais 50 artigos para verificar (diversos intervalos)
const arts = [
  // Início
  '3', '5', '8', '10', '12', '14', '15', '16', '18', '19',
  // Competência
  '22', '23', '25', '44', '46', '47', '51', '53', '55', '62',
  // Partes
  '75', '77', '82', '85', '91', '95', '100', '102', '105', '106',
  // Atos processuais
  '109', '112', '119', '126', '131', '135', '141', '149', '156', '165',
  // Procedimento
  '200', '203', '212', '229', '231', '238', '240', '246', '250', '260'
];

console.log('=== VERIFICAÇÃO ADICIONAL DE 50 ARTIGOS DO CPC ===\n');

let ok = 0, prob = 0;
for (const n of arts) {
  const a = j.find(x => x.numero === n);
  if (!a) {
    console.log('❌ Art.' + n + ': NÃO ENCONTRADO');
    prob++;
    continue;
  }
  const i = a.incisos.length;
  const p = a.paragrafos.length;
  const caputOk = a.caput && a.caput.length > 10 && !a.caput.startsWith('.');
  if (caputOk) {
    console.log('✅ Art.' + n + ': ' + i + 'inc ' + p + '§ | "' + a.caput.substring(0, 50) + '..."');
    ok++;
  } else {
    console.log('⚠️ Art.' + n + ': caput inválido: "' + (a.caput || '').substring(0, 30) + '"');
    prob++;
  }
}

console.log('\n=== RESUMO ===');
console.log('OK: ' + ok + ' | Problemas: ' + prob);

// Verificar também artigos do meio e fim
console.log('\n=== ARTIGOS IMPORTANTES ADICIONAIS ===');
const importantes = ['273', '303', '311', '334', '350', '357', '381', '392', '400', '420', '450', '500', '550', '600', '650', '750', '800', '850', '900', '950'];
for (const n of importantes) {
  const a = j.find(x => x.numero === n);
  if (!a) {
    console.log('❌ Art.' + n + ': NÃO ENCONTRADO');
  } else {
    console.log('✅ Art.' + n + ': ' + a.incisos.length + 'inc ' + a.paragrafos.length + '§ | "' + a.caput.substring(0, 45) + '..."');
  }
}
