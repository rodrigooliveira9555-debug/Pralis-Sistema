/*
 * Área ConPlus — o texto de cada código das listas do Questor, para o formulário mostrar "2 · Feminino" em vez de só "2".
 * Fonte: as listas do formulário de Admissão do Questor Zen da ConPlus (Escritório Virtual), lidas em 27/11/2026
 * (mapa em D:\DevCaches\tmp\conplus\zen\mapa-questor-zen.md). Só o texto: quais códigos valem vem de regras-questor.js.
 * Código sem texto aqui aparece sozinho no formulário (nada é inventado).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzConplusRotulosQuestor = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SIM_NAO = { 1: 'Sim', 0: 'Não' };
  const ESTADOCIVIL = { 0: 'Não informado', 1: 'Solteiro', 2: 'Casado', 3: 'Divorciado ou separado judicialmente', 4: 'Viúvo', 5: 'Concubinato', 6: 'Outros', 7: 'Casado, comunhão total', 8: 'Casado, sem comunhão', 9: 'Casado, comunhão parcial' };
  const GRAUINSTR = { 0: 'Não informado', 1: 'Analfabeto', 2: 'Até o 5º ano incompleto', 3: '5º ano completo', 4: 'Do 6º ao 9º ano incompleto', 5: 'Fundamental completo', 6: 'Médio incompleto', 7: 'Médio completo', 8: 'Superior incompleto', 9: 'Superior completo', 10: 'Especialização', 11: 'Mestrado', 12: 'Doutorado', 13: 'Ph.D.' };
  const NACIONALIDADE = { 0: 'Selecione', 10: 'Brasileiro', 15: 'Brasileiro nascido no exterior', 20: 'Naturalizado brasileiro', 21: 'Argentino', 22: 'Boliviano', 23: 'Chileno', 24: 'Paraguaio', 25: 'Uruguaio', 26: 'Venezuelano', 27: 'Colombiano', 28: 'Peruano', 29: 'Equatoriano', 30: 'Alemão', 31: 'Belga', 32: 'Britânico', 34: 'Canadense', 35: 'Espanhol', 36: 'Norte-americano', 37: 'Francês', 38: 'Suíço', 39: 'Italiano', 40: 'Haitiano', 41: 'Japonês', 42: 'Chinês', 43: 'Coreano', 44: 'Russo', 45: 'Português', 46: 'Paquistanês', 47: 'Indiano', 48: 'Outros latino-americanos', 49: 'Outros asiáticos', 50: 'Outros', 51: 'Outros europeus', 60: 'Angolano', 61: 'Congolês', 62: 'Sul-africano', 70: 'Outros africanos' };
  const ROTULOS = {
    SEXO: { 1: 'Masculino', 2: 'Feminino' },
    RACACOR: { 1: 'Indígena', 2: 'Branca', 4: 'Preta', 6: 'Amarela', 8: 'Parda', 9: 'Não informado' },
    ESTADOCIVIL, GRAUINSTR, NACIONALIDADE,
    TMPRESID: { 1: 'Prazo indeterminado', 2: 'Prazo determinado' },
    TIPOVINCULO: { 10: 'Urbano, PJ, CLT, prazo indeterminado', 15: 'Urbano, PF, CLT, prazo indeterminado', 50: 'Temporário (Lei 6.019)', 55: 'Aprendiz', 60: 'Urbano, PJ, CLT, prazo determinado', 65: 'Urbano, PF, CLT, prazo determinado' },
    TIPOADMRAIS: { 1: 'Primeiro emprego', 2: 'Reemprego', 3: 'Transferência com ônus', 4: 'Transferência sem ônus', 5: 'Reintegração' },
    TIPOADMCAGED: { 10: 'Primeiro emprego', 20: 'Reemprego', 25: 'Prazo determinado (Lei 9.601)', 35: 'Reintegração', 70: 'Transferência de entrada' },
    RECEBEADTO: { 1: 'No mês da admissão', 2: 'Mês seguinte', 3: 'Não recebe', 4: 'Após a experiência' },
    MODOPGTO: { 1: 'Dinheiro', 2: 'Cheque', 3: 'Bancária' },
    TIPOCONTA: { 1: 'Conta corrente', 2: 'Poupança', 3: 'DOC', 4: 'Conta/cartão salário', 5: 'Conta eletrônica', 6: 'Cheque' },
    TIPOPIX: { 0: 'Não é Pix', 1: 'Pix transferência', 2: 'Pix QR-Code' },
    TIPOCHAVEPIX: { '00': 'Não se aplica', '01': 'Telefone', '02': 'E-mail', '03': 'CPF', '04': 'Dados bancários' },
    REGIMEJOR: { 1: 'Horário de trabalho (CLT, cap. II)', 2: 'Atividade externa (art. 62, I)', 3: 'Funções do art. 62, II', 4: 'Teletrabalho (art. 62, III)' },
    TIPOJORNADA: { 2: '12 x 36', 3: 'Horário fixo e folga variável', 4: 'Horário fixo e folga fixa no domingo', 5: 'Horário fixo e folga fixa fora do domingo', 6: 'Folga fixa e domingo periódico', 7: 'Turno de revezamento', 9: 'Demais tipos de jornada' },
    TEMPOPARCIAL: { 0: 'Não é tempo parcial', 1: 'Até 25 h semanais', 2: 'Até 30 h semanais', 3: 'Até 26 h semanais' },
    AGENTENOCIVO: { '00': 'Não exposto', 15: 'Aposentadoria especial aos 15 anos', 20: 'Aposentadoria especial aos 20 anos', 25: 'Aposentadoria especial aos 25 anos' },
    TIPOADM: { 1: 'Admissão', 2: 'Transferência no mesmo grupo', 3: 'Transferência de consórcio', 4: 'Transferência por sucessão', 5: 'Transferência de doméstico', 6: 'Mudança de CPF', 7: 'Transferência de sucedida inapta' },
    TIPOSALARIO: { 1: 'Mensal', 2: 'Comissão/variável', 5: 'Hora', 6: 'Tarefa', 7: 'Bolsista' },
    CATEGORIA: { '01': 'Empregado', '02': 'Trabalhador avulso', '03': 'Afastado p/ serviço militar', '04': 'Prazo determinado (Lei 9.601)', '05': 'Diretor com FGTS', '06': 'Doméstico', '07': 'Aprendiz', 11: 'Diretor sem FGTS' },
    CERTCIVILTIPO: { 0: 'Nascimento', 1: 'Casamento', 2: 'Indígena', 3: 'Óbito' },
    PARENTESCO: { '01': 'Filho(a)', '02': 'Cônjuge', '03': 'Pai/Mãe', '04': 'Avô/Avó', '05': 'Bisavô/Bisavó', '06': 'Sobrinho(a)', '07': 'Tio(a)', '08': 'Neto(a)', '09': 'Sogro(a)', 10: 'Genro/Nora', 11: 'Enteado(a)', 12: 'Irmão(ã)', 13: 'Filho(a) adotivo(a)', 14: 'Outros', 15: 'Menor sob tutela', 16: 'Companheiro(a)', 17: 'Filho/enteado universitário até 24', 18: 'Filho/enteado incapacitado', 19: 'Irmão/neto/bisneto com guarda, até 24', 20: 'Irmão/neto/bisneto com guarda, incapacitado', 21: 'Menor pobre com guarda judicial', 22: 'Ex-cônjuge com pensão' },
    FORMACONTROLEIR: { 1: 'Por mês', 2: 'Por ano' },
    CONTROLEVACIN: { 1: 'Data', 2: 'Doze meses', 3: 'Seis meses' },
    NATUREZAESTAGIO: { 0: 'Não obrigatório', 1: 'Obrigatório' },
    NIVELESTAGIO: { 1: 'Fundamental', 2: 'Médio', 3: 'Formação profissional', 4: 'Superior', 8: 'Especial', 9: 'Mãe social' },
    MOTIVOCONTRAT: { 1: 'Substituição transitória', 2: 'Demanda complementar' },
    TPINCLCONTR: { 1: 'Locais sem filiais', 2: 'Estudo de mercado', 3: 'Contratação superior a 3 meses' },
  };
  /** Texto do código (ou ''). Campo lógico sem lista própria usa Sim/Não. */
  function rotulo(campo, codigo, logico) {
    const tab = ROTULOS[campo];
    if (tab && tab[codigo] != null) return tab[codigo];
    if (logico && SIM_NAO[codigo] != null) return SIM_NAO[codigo];
    return '';
  }
  return { ROTULOS, rotulo };
}));
