// parser.js
function logStep(...args) {
  console.log(...args);
}

export function parseQuiz(markdown) {
  logStep('Iniciando parseo del markdown del quiz');
  const lines = markdown.split('\n').map(line => line.trim()).filter(line => line);
  const quiz = { title: '', description: '', questions: [] };

  let currentQuestion = null;
  let questionLines = [];
  let currentSubject = null;

  // Reconoce líneas como "1. 5💎| Texto de la pregunta"
  const questionRegex = /^(\d+)\.\s*(?:(\d+)(?:💎)?\|)?\s*(.+)$/;

  for (const line of lines) {
    // Título principal (# ...)
    if (line.startsWith('# ') && !quiz.title) {
      quiz.title = line.slice(2).trim();
      logStep('Título parseado:', quiz.title);
      continue;
    }

    // Descripción principal (## ...) o cambio de subject
    if (line.startsWith('## ')) {
      if (!quiz.description && !currentSubject && quiz.questions.length === 0) {
        quiz.description = line.slice(3).trim().split('|')[0].trim();
        logStep('Descripción parseada:', quiz.description);
        continue;
      } else {
        // Parseamos la línea de subject
        const subjectLine = line.slice(3).trim();
        const parts = subjectLine.split('|').map(p => p.trim());
        const subjectName = parts[0] || 'Untitled Subject';
        let pick = null;
        let multiplier = null;

        for (let i = 1; i < parts.length; i++) {
          const segment = parts[i].toLowerCase();
          if (segment.includes('pick:')) {
            pick = parseInt(parts[i].split(':')[1].trim()) || null;
          }
          if (segment.includes('multiplier:')) {
            multiplier = parseInt(parts[i].split(':')[1].trim()) || null;
          }
        }

        currentSubject = { name: subjectName, pick, multiplier };
        logStep('Nuevo tema/subject:', currentSubject);
        continue;
      }
    }

    // Detecta nueva pregunta
    const questionMatch = line.match(questionRegex);
    if (questionMatch) {
      if (currentQuestion) {
        parseQuestionLines(currentQuestion, questionLines);
        quiz.questions.push(currentQuestion);
      }
      const [, number, points, text] = questionMatch;
      currentQuestion = {
        number: parseInt(number),
        points: points ? parseInt(points) : 1,
        text: text.trim(),
        type: null,
        options: [],
        answer: null,
        prompt: '',
        feedbacks: [],
        subject: currentSubject
      };
      logStep('Nueva pregunta:', currentQuestion.text);
      questionLines = [];
      continue;
    }

    // Acumula líneas de la pregunta
    if (currentQuestion) {
      questionLines.push(line);
    }
  }

  if (currentQuestion) {
    parseQuestionLines(currentQuestion, questionLines);
    quiz.questions.push(currentQuestion);
  }

  logStep('Parseo finalizado. Quiz resultante:', quiz);
  return quiz;
}

function parseQuestionLines(question, lines) {
  logStep('Procesando líneas para:', question.text);
  let numericalAnswer = null;

  for (const line of lines) {
    if (line.startsWith('❓')) {
      question.prompt = line.slice(1).trim();
    }
    else if (line.startsWith('- ')) {
      // Opción normal
      const optionMatch = line.match(/^- (.+?)(?: \| (🟢|🟡|🔴)?\s*(.+))?$/);
      if (optionMatch) {
        const [, text, level, feedback] = optionMatch;
        question.options.push({ text, feedback: feedback ? { level, message: feedback } : null });
      }
    }
    else if (/^(🟢|🟡|🔴)\s/.test(line)) {
      // Puede ser feedback condicional o una opción "inline"
      const feedbackMatch = line.match(/^(🟢|🟡|🔴)\s*(.+?)\|(.*)$/);
      if (feedbackMatch) {
        const [, level, condition, message] = feedbackMatch;
        // Detectamos si "condition" se parece a un patrón de feedback condicional
        // Por ejemplo: "1,2,3", ">=3000", "81-100% match", etc.
        const isConditional = /(\d+,\d+|>=\d+|match|%\s*match)/i.test(condition);

        if (isConditional) {
          // Es feedback condicional
          question.feedbacks.push({ level, condition: condition.trim(), message: message.trim() });
        } else {
          // Lo tratamos como una opción
          const text = condition.trim();
          question.options.push({ text, feedback: { level, message: message.trim() } });
        }
      }
      else {
        // Si no coincide, lo ignoramos o lo tratamos como texto suelto
      }
    }
    else if (line.startsWith('=')) {
      // Respuesta numérica
      numericalAnswer = line.slice(1).trim();
    }
  }

  // Determinamos el tipo
  if (numericalAnswer) {
    question.type = 'numerical';
    if (numericalAnswer.includes('+-')) {
      const [value, tolerance] = numericalAnswer.split('+-').map(s => parseFloat(s.trim()));
      question.answer = { value, tolerance };
    } else if (numericalAnswer.startsWith('[') && numericalAnswer.endsWith(']')) {
      const [min, max] = numericalAnswer.slice(1, -1).split(',').map(s => parseFloat(s.trim()));
      question.answer = { min, max };
    } else {
      question.answer = { value: parseFloat(numericalAnswer), tolerance: 0 };
    }
  }
  else if (question.options.length > 0) {
    const correctOptions = question.options.filter(o => o.feedback && o.feedback.level === '🟢');
    if (correctOptions.length === 1 && question.options.length === 2) {
      // Caso typical: 2 opciones => true_false
      question.type = 'true_false';
      question.answer = question.options.indexOf(correctOptions[0]);
    } else if (correctOptions.length === 1) {
      // multiple_choice
      question.type = 'multiple_choice';
      question.answer = question.options.indexOf(correctOptions[0]);
    } else {
      // select_all
      question.type = 'select_all';
      const correctFeedback = question.feedbacks.find(f => f.level === '🟢');
      if (correctFeedback) {
        question.answer = correctFeedback.condition.split(',').map(i => parseInt(i.trim()) - 1);
      } else {
        question.answer = [];
      }
    }
  }
  else if (question.text.includes('___')) {
    question.type = 'fill_in_blank';
    const correctFeedback = question.feedbacks.find(f => f.level === '🟢');
    if (correctFeedback) {
      question.answer = correctFeedback.condition.split(',').map(s => s.trim());
    } else {
      question.answer = [];
    }
  }
  else if (question.feedbacks.length > 0) {
    question.type = 'long_answer';
  }
  else {
    question.type = 'unknown';
  }
}
