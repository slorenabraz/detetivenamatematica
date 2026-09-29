// Base de dados local em localStorage
function initDB() {
  if (!localStorage.getItem('db_usuarios')) {
    localStorage.setItem('db_usuarios', JSON.stringify([]));
  }
  if (!localStorage.getItem('db_resultados')) {
    localStorage.setItem('db_resultados', JSON.stringify([]));
  }
}
initDB();

let currentUser = JSON.parse(localStorage.getItem('session_user')) || null;
let currentTimer = null;
let tempoRestante = 60;
let questaoAtualIndex = 0;
let questoesAtivas = [];
let acertosAtuais = 0;
let errosAtuais = 0;
let tempoInicioQuestao = 0;
let temposPorQuestao = [];

// Base de Perguntas Pedagógicas
const bancoQuestoes = {
  etapa1: [
    {
      pergunta: "Em qual dos triângulos abaixo a relação de Pitágoras está INCORRETA?",
      opcoes: ["a² = b² + c²", "c² = a² + b²", "a² = b² - c²"],
      correta: 2
    },
    {
      pergunta: "Se os catetos de um triângulo retângulo medem 3 e 4, a hipotenusa é:",
      opcoes: ["5", "6", "7"],
      correta: 0
    }
  ],
  etapa2: [
    {
      pergunta: "A Lei dos Senos estabelece que a/sin(A) é igual a:",
      opcoes: ["b/sin(B)", "b * sin(B)", "a² + b²"],
      correta: 0
    },
    {
      pergunta: "A Lei dos Senos é especialmente útil para:",
      opcoes: ["Triângulos quaisquer com ângulos e lados conhecidos", "Apenas triângulos retângulos", "Círculos perfeitos"],
      correta: 0
    }
  ],
  etapa3: [
    {
      pergunta: "A fórmula da Lei dos Cossenos para o lado 'a' é:",
      opcoes: ["a² = b² + c² - 2bc·cos(A)", "a² = b² + c² + 2bc·cos(A)", "a = b + c - cos(A)"],
      correta: 0
    },
    {
      pergunta: "Quando o ângulo A for de 90°, a Lei dos Cossenos reduz-se a:",
      opcoes: ["Teorema de Pitágoras", "Lei dos Senos", "Relação de Semelhança"],
      correta: 0
    }
  ],
  etapa4: [
    {
      pergunta: "Dois triângulos são semelhantes quando:",
      opcoes: ["Seus ângulos correspondentes são iguais e lados proporcionais", "Possuem exatamente a mesma área", "São ambos retângulos"],
      correta: 0
    },
    {
      pergunta: "Se a razão de semelhança entre dois triângulos é 2, a razão entre suas áreas é:",
      opcoes: ["4", "2", "8"],
      correta: 0
    }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  showPage('inicio');
});

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${pageId}`).classList.remove('hidden');

  if (pageId === 'ranking') carregarRanking();
  if (pageId === 'professores') carregarProfessores();
  if (pageId === 'resultados') carregarResultadosAluno();
  if (pageId === 'turmas') carregarPainelProfessor();
}

function toggleSerieSelect() {
  const tipo = document.getElementById('reg-tipo').value;
  const group = document.getElementById('group-serie');
  const emailInput = document.getElementById('reg-email');

  if (tipo === 'professor') {
    group.classList.add('hidden');
    emailInput.placeholder = "nome@professor.educacao.sp.gov.br";
  } else {
    group.classList.remove('hidden');
    emailInput.placeholder = "000...SP@aluno.educacao.sp.gov.br";
  }
}

// Registro com regras estritas de validação
function handleRegister(e) {
  e.preventDefault();
  const nome = document.getElementById('reg-nome').value.trim();
  const tipo = document.getElementById('reg-tipo').value;
  const email = document.getElementById('reg-email').value.trim();
  const senha = document.getElementById('reg-senha').value;
  const serie = document.getElementById('reg-serie').value;

  if (tipo === 'aluno') {
    const regexAluno = /^[0-9]+SP@aluno\.educacao\.sp\.gov\.br$/i;
    if (!regexAluno.test(email)) {
      alert("Erro: O e-mail do aluno deve seguir o padrão: 000...SP@aluno.educacao.sp.gov.br");
      return;
    }
  } else if (tipo === 'professor') {
    const regexProf = /^[a-zA-Z0-9._%+-]+@professor\.educacao\.sp\.gov\.br$/i;
    if (!regexProf.test(email)) {
      alert("Erro: O e-mail do professor deve seguir o padrão: nome@professor.educacao.sp.gov.br");
      return;
    }
    if (senha.length < 3 || senha.length > 8) {
      alert("Erro: A senha do professor deve conter entre 3 e 8 caracteres.");
      return;
    }
  }

  const usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
  if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    alert("Erro: Este e-mail já está cadastrado.");
    return;
  }

  const novoUsuario = { id: Date.now(), nome, tipo, email, senha, serie: tipo === 'aluno' ? serie : 'N/A' };
  usuarios.push(novoUsuario);
  localStorage.setItem('db_usuarios', JSON.stringify(usuarios));

  alert("Cadastro realizado com sucesso! Efetue o login.");
  document.getElementById('form-register').reset();
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  const usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
  const user = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha);

  if (!user) {
    alert("Usuário ou senha incorretos.");
    return;
  }

  currentUser = user;
  localStorage.setItem('session_user', JSON.stringify(currentUser));
  updateNav();
  showPage('inicio');
}

function logout() {
  if (confirm("Deseja fechar a sessão do utilizador atual?")) {
    currentUser = null;
    localStorage.removeItem('session_user');
    updateNav();
    showPage('inicio');
  }
}

function updateNav() {
  const isLogged = !!currentUser;
  document.getElementById('btn-login').classList.toggle('hidden', isLogged);
  document.getElementById('btn-logout').classList.toggle('hidden', !isLogged);
  document.getElementById('nav-desafios').classList.toggle('hidden', !isLogged);
  document.getElementById('nav-resultados').classList.toggle('hidden', !isLogged);
  document.getElementById('nav-turmas').classList.toggle('hidden', !isLogged);
}

// Gestão de Desafios e Cronómetro
function carregarEtapa(numEtapa) {
  const chave = `etapa${numEtapa}`;
  questoesAtivas = [...bancoQuestoes[chave]];
  iniciarQuiz(`Etapa ${numEtapa}`);
}

function iniciarTeste30() {
  questoesAtivas = [
    ...bancoQuestoes.etapa1,
    ...bancoQuestoes.etapa2,
    ...bancoQuestoes.etapa3,
    ...bancoQuestoes.etapa4
  ];
  iniciarQuiz("Teste de Conhecimento Ampliado");
}

function iniciarQuiz(titulo) {
  questaoAtualIndex = 0;
  acertosAtuais = 0;
  errosAtuais = 0;
  temposPorQuestao = [];
  document.getElementById('quiz-card').classList.remove('hidden');
  document.getElementById('quiz-titulo').innerText = titulo;
  exibirQuestao();
}

function exibirQuestao() {
  clearInterval(currentTimer);
  document.getElementById('quiz-feedback').innerText = '';
  document.getElementById('btn-proxima').classList.add('hidden');

  if (questaoAtualIndex >= questoesAtivas.length) {
    finalizarQuiz();
    return;
  }

  const q = questoesAtivas[questaoAtualIndex];
  document.getElementById('quiz-pergunta').innerText = `${questaoAtualIndex + 1}. ${q.pergunta}`;

  const opcoesDiv = document.getElementById('quiz-opcoes');
  opcoesDiv.innerHTML = '';

  q.opcoes.forEach((opcao, index) => {
    const btn = document.createElement('button');
    btn.innerText = opcao;
    btn.onclick = () => responder(index);
    opcoesDiv.appendChild(btn);
  });

  tempoRestante = 60;
  tempoInicioQuestao = Date.now();
  const timerElem = document.getElementById('cronometro');
  timerElem.classList.remove('piscar');
  timerElem.innerText = `Tempo: ${tempoRestante}s`;

  currentTimer = setInterval(() => {
    tempoRestante--;
    timerElem.innerText = `Tempo: ${tempoRestante}s`;

    if (tempoRestante <= 10) {
      timerElem.classList.add('piscar');
    }

    if (tempoRestante <= 0) {
      clearInterval(currentTimer);
      tratarTempoEsgotado();
    }
  }, 1000);
}

function responder(opcaoSelecionada) {
  clearInterval(currentTimer);
  const q = questoesAtivas[questaoAtualIndex];
  const tempoGasto = Math.round((Date.now() - tempoInicioQuestao) / 1000);
  temposPorQuestao.push(tempoGasto);

  const botoes = document.getElementById('quiz-opcoes').children;
  Array.from(botoes).forEach(b => b.disabled = true);

  if (opcaoSelecionada === q.correta) {
    acertosAtuais++;
    botoes[opcaoSelecionada].classList.add('correta');
    document.getElementById('quiz-feedback').innerText = "Resposta Correta! Excelente trabalho.";
  } else {
    errosAtuais++;
    botoes[opcaoSelecionada].classList.add('incorreta');
    botoes[q.correta].classList.add('correta');
    document.getElementById('quiz-feedback').innerText = "Resposta Incorreta.";
  }

  document.getElementById('btn-proxima').classList.remove('hidden');
}

function tratarTempoEsgotado() {
  errosAtuais++;
  temposPorQuestao.push(60);
  const q = questoesAtivas[questaoAtualIndex];
  const botoes = document.getElementById('quiz-opcoes').children;
  Array.from(botoes).forEach(b => b.disabled = true);
  botoes[q.correta].classList.add('correta');
  document.getElementById('quiz-feedback').innerText = "Tempo esgotado! A resposta correta foi destacada.";
  document.getElementById('btn-proxima').classList.remove('hidden');
}

function proximaQuestao() {
  questaoAtualIndex++;
  exibirQuestao();
}

function encerrarTeste() {
  clearInterval(currentTimer);
  finalizarQuiz();
}

function finalizarQuiz() {
  document.getElementById('quiz-card').classList.add('hidden');
  const mediaTempo = temposPorQuestao.length > 0 
    ? (temposPorQuestao.reduce((a, b) => a + b, 0) / temposPorQuestao.length).toFixed(1)
    : 0;

  if (currentUser && currentUser.tipo === 'aluno') {
    const resultados = JSON.parse(localStorage.getItem('db_resultados'));
    resultados.push({
      usuarioId: currentUser.id,
      alunoNome: currentUser.nome,
      serie: currentUser.serie,
      etapa: document.getElementById('quiz-titulo').innerText,
      acertos: acertosAtuais,
      erros: errosAtuais,
      tempoMedio: mediaTempo,
      data: new Date().toLocaleDateString('pt-BR')
    });
    localStorage.setItem('db_resultados', JSON.stringify(resultados));
  }

  alert(`Desafio Finalizado!\nAcertos: ${acertosAtuais}\nErros: ${errosAtuais}\nTempo Médio por questão: ${mediaTempo}s`);
  showPage('resultados');
}

function carregarResultadosAluno() {
  const container = document.getElementById('estatisticas-aluno');
  if (!currentUser) return;

  const resultados = JSON.parse(localStorage.getItem('db_resultados'))
    .filter(r => r.usuarioId === currentUser.id);

  if (resultados.length === 0) {
    container.innerHTML = "<p>Ainda não realizou nenhum desafio.</p>";
    return;
  }

  let html = '<ul>';
  resultados.forEach(r => {
    html += `<li><strong>${r.etapa}</strong> - Acertos: ${r.acertos} | Erros: ${r.erros} | Tempo Médio: ${r.tempoMedio}s (${r.data})</li>`;
  });
  html += '</ul>';
  container.innerHTML = html;
}

function carregarPainelProfessor() {
  const container = document.getElementById('painel-professor-conteudo');
  if (!currentUser || currentUser.tipo !== 'professor') {
    container.innerHTML = "<p>Apenas professores têm acesso a esta funcionalidade.</p>";
    return;
  }

  const usuarios = JSON.parse(localStorage.getItem('db_usuarios')).filter(u => u.tipo === 'aluno');
  const resultados = JSON.parse(localStorage.getItem('db_resultados'));

  let html = '<h3>Alunos Registados por Série</h3>';
  usuarios.forEach(aluno => {
    const resAluno = resultados.filter(r => r.usuarioId === aluno.id);
    const totalAcertos = resAluno.reduce((acc, r) => acc + r.acertos, 0);
    const totalErros = resAluno.reduce((acc, r) => acc + r.erros, 0);
    
    html += `<div class="quiz-container" style="margin-bottom: 1rem;">
      <p><strong>Nome:</strong> ${aluno.nome} | <strong>Série:</strong> ${aluno.serie}</p>
      <p>Total de Acertos: ${totalAcertos} | Total de Erros: ${totalErros}</p>
    </div>`;
  });

  container.innerHTML = html;
}

function carregarProfessores() {
  const lista = document.getElementById('lista-professores');
  const profs = JSON.parse(localStorage.getItem('db_usuarios'))
    .filter(u => u.tipo === 'professor')
    .sort((a, b) => a.nome.localeCompare(b.nome));

  if (profs.length === 0) {
    lista.innerHTML = "<li>Nenhum professor registado até ao momento.</li>";
    return;
  }

  lista.innerHTML = profs.map(p => `<li><strong>${p.nome}</strong> - Contacto: ${p.email}</li>`).join('');
}

function carregarRanking() {
  const lista = document.getElementById('lista-ranking');
  const resultados = JSON.parse(localStorage.getItem('db_resultados'));

  const pontuacao = {};
  resultados.forEach(r => {
    if (!pontuacao[r.usuarioId]) {
      pontuacao[r.usuarioId] = { nome: r.alunoNome, serie: r.serie, acertos: 0 };
    }
    pontuacao[r.usuarioId].acertos += r.acertos;
  });

  const ordenados = Object.values(pontuacao).sort((a, b) => b.acertos - a.acertos);

  if (ordenados.length === 0) {
    lista.innerHTML = "<li>Nenhuma pontuação registada no ranking.</li>";
    return;
  }

  lista.innerHTML = ordenados.map(p => `<li>${p.nome} (${p.serie}) — <strong>${p.acertos} acertos</strong></li>`).join('');
}