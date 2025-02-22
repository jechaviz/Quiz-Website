<script>
  import { onMount, tick } from 'svelte';
  import { parseQuiz } from './parser.js';
  import { quizData, currentQuestionIndex, userAnswers, score } from './stores.js';

  export let onNavigateResult;
  export let onNavigateHome;

  let state = 'loading';
  let userInput = '';
  let feedback = null;
  let config = { allowNavigation: true };

  // Para mostrar feedback largo de manera truncada
  let showFullFeedback = false;

  // Para autoavance tras respuesta correcta
  let nextAutoTimer = null;
  let nextButtonAnimation = false;

  // Logs
  let debugLogs = [];
  function logStep(...args) {
    const message = args.join(' ');
    console.log(message);
    debugLogs.push(message);
  }

  $: currentQuestion = $quizData?.questions[$currentQuestionIndex];
  $: totalQuestions = $quizData?.questions.length || 0;
  $: active = state === 'ready';

  let sliderValue = 0;

  onMount(async () => {
    if (!$quizData) {
      try {
        logStep('Iniciando carga del quiz...');
        const response = await fetch('/sample_quiz.md');
        if (!response.ok) {
          logStep('Error al cargar el quiz:', response.statusText);
          state = 'error';
          return;
        }
        const markdown = await response.text();
        $quizData = parseQuiz(markdown);
        $userAnswers = new Array($quizData.questions.length).fill(null);
        $score = 0;
        state = 'ready';
        logStep('Quiz cargado correctamente');
      } catch (error) {
        logStep('Error al cargar quiz:', error);
        state = 'error';
      }
    } else {
      state = 'ready';
    }
  });

  // Actualiza slider
  $: if (active) {
    sliderValue = $currentQuestionIndex;
  }

  function handleSliderChange(e) {
    jumpToQuestion(+e.target.value);
  }

  function evaluateAnswer() {
    const q = currentQuestion;
    let isCorrect = false;
    feedback = null;
    showFullFeedback = false; // reset truncado

    logStep(`Evaluando respuesta de la pregunta ${$currentQuestionIndex}, tipo: ${q.type}`);

    switch (q.type) {
      case 'multiple_choice':
      case 'true_false': {
        isCorrect = userInput === q.answer;
        feedback = q.options[userInput]?.feedback || { level: '🔴', message: 'Incorrecto' };
        break;
      }
      case 'select_all': {
        isCorrect = Array.isArray(userInput) &&
          userInput.length === q.answer.length &&
          userInput.every(i => q.answer.includes(i));
        feedback =
          q.feedbacks.find(f => f.level === (isCorrect ? '🟢' : '🔴')) ||
          { level: '🔴', message: 'Incorrecto' };
        break;
      }
      case 'fill_in_blank': {
        isCorrect = q.answer.some(ans => ans.toLowerCase() === userInput.trim().toLowerCase());
        feedback = { level: isCorrect ? '🟢' : '🔴', message: isCorrect ? 'Correcto' : 'Incorrecto' };
        break;
      }
      case 'long_answer': {
        const lengthCondition = q.feedbacks.find(f => f.condition.startsWith('>='));
        if (lengthCondition) {
          const minLength = parseInt(lengthCondition.condition.split('>=')[1]);
          if (userInput.length >= minLength) {
            isCorrect = true;
            feedback = { level: '🟢', message: lengthCondition.message };
          } else {
            feedback = { level: '🔴', message: 'Muy corto' };
          }
        }
        break;
      }
      case 'numerical': {
        const num = parseFloat(userInput);
        if ('value' in q.answer) {
          isCorrect = Math.abs(num - q.answer.value) <= q.answer.tolerance;
        } else {
          isCorrect = num >= q.answer.min && num <= q.answer.max;
        }
        feedback = { level: isCorrect ? '🟢' : '🔴', message: isCorrect ? 'Correcto' : 'Incorrecto' };
        break;
      }
      default: {
        feedback = { level: '🔴', message: 'Tipo de pregunta no reconocido' };
      }
    }

    $userAnswers[$currentQuestionIndex] = userInput;
    if (isCorrect) {
      $score += q.points;
      logStep('¡Respuesta correcta!');
      // Autoavance tras 2s
      nextButtonAnimation = true;
      nextAutoTimer = setTimeout(() => {
        goToNext();
        nextButtonAnimation = false;
      }, 2000);
    } else {
      logStep('Respuesta incorrecta o incompleta');
    }

    return isCorrect;
  }

  // Para multiple_choice / true_false => clic directo
  function handleOptionClick(i) {
    // Cancelamos cualquier autoavance previo
    if (nextAutoTimer) {
      clearTimeout(nextAutoTimer);
      nextAutoTimer = null;
      nextButtonAnimation = false;
    }
    userInput = i;
    evaluateAnswer();
  }

  // Para numeric, fill_in_blank y long_answer => clic en "Enviar"
  function submitAnswer() {
    // Cancelamos autoavance previo
    if (nextAutoTimer) {
      clearTimeout(nextAutoTimer);
      nextAutoTimer = null;
      nextButtonAnimation = false;
    }
    evaluateAnswer();
  }

  function goToNext() {
    if ($currentQuestionIndex < totalQuestions - 1) {
      $currentQuestionIndex++;
      userInput = $userAnswers[$currentQuestionIndex] ?? (currentQuestion.type === 'select_all' ? [] : '');
      feedback = null;
      showFullFeedback = false;
      logStep('Siguiente pregunta:', $currentQuestionIndex);
    } else {
      logStep('Quiz completado -> Ir a resultados');
      onNavigateResult?.();
    }
  }

  function goToPrevious() {
    // Cancelamos autoavance
    if (nextAutoTimer) {
      clearTimeout(nextAutoTimer);
      nextAutoTimer = null;
      nextButtonAnimation = false;
    }
    if ($currentQuestionIndex > 0) {
      $currentQuestionIndex--;
      userInput = $userAnswers[$currentQuestionIndex] ?? (currentQuestion.type === 'select_all' ? [] : '');
      feedback = null;
      showFullFeedback = false;
      logStep('Pregunta anterior:', $currentQuestionIndex);
    }
  }

  function jumpToQuestion(index) {
    // Cancelamos autoavance
    if (nextAutoTimer) {
      clearTimeout(nextAutoTimer);
      nextAutoTimer = null;
      nextButtonAnimation = false;
    }
    $currentQuestionIndex = index;
    userInput = $userAnswers[$currentQuestionIndex] ?? (currentQuestion.type === 'select_all' ? [] : '');
    feedback = null;
    showFullFeedback = false;
    logStep('Saltando a pregunta:', index);
  }

  function handleSelectAll(event) {
    // Cancelamos autoavance
    if (nextAutoTimer) {
      clearTimeout(nextAutoTimer);
      nextAutoTimer = null;
      nextButtonAnimation = false;
    }
    const value = parseInt(event.target.value);
    if (event.target.checked) {
      userInput = [...userInput, value];
    } else {
      userInput = userInput.filter(i => i !== value);
    }
    evaluateAnswer();
  }

  function toggleFullFeedback() {
    showFullFeedback = !showFullFeedback;
  }
</script>

<section class="quiz" class:active>
  {#if state === 'loading'}
    <p>Cargando Quiz...</p>
  {:else if state === 'error'}
    <p>Error al cargar el quiz. Por favor, intenta nuevamente.</p>
  {:else}
    <!-- ENCABEZADO -->
    <header>
      {#if currentQuestion.subject}
        <h3 class="subject-info">
          {currentQuestion.subject.name}
          {#if currentQuestion.subject.pick}
            | Pick: {currentQuestion.subject.pick}
          {/if}
          {#if currentQuestion.subject.multiplier}
            | 💎 Multiplier: {currentQuestion.subject.multiplier}
          {/if}
        </h3>
      {/if}
      <div class="question-info">
        <span>Pregunta {$currentQuestionIndex + 1} de {totalQuestions}</span>
        {#if config.allowNavigation}
          <input
            class="question-slider"
            type="range"
            min="0"
            max={totalQuestions - 1}
            bind:value={sliderValue}
            on:change={handleSliderChange}
          />
        {/if}
      </div>
      <!-- PUNTAJE en un pequeño recuadro -->
      <div class="score-box">
        <span>Puntaje: {$score}</span>
        <span class="question-points">({currentQuestion.points} <span class="diamond">💎</span>)</span>
      </div>
    </header>

    <!-- CUERPO DE LA PREGUNTA -->
    <div class="question">
      <p>{currentQuestion.text}</p>
      {#if currentQuestion.prompt}
        <p class="prompt">{currentQuestion.prompt}</p>
      {/if}
      <div class="input">
        {#if currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false'}
          {#each currentQuestion.options as option, i}
            <button
              on:click={() => handleOptionClick(i)}
              class:option-button
              class:correct={feedback && feedback.level === '🟢' && userInput === i}
              class:incorrect={feedback && feedback.level === '🔴' && userInput === i}
              disabled={feedback && feedback.level === '🟢'}
            >
            <!-- 
                Deshabilitamos el botón si la respuesta ya es correcta (feedback = '🟢'),
                para que no cambie tras acertar.
              -->
              {option.text}
            </button>
          {/each}
        {:else if currentQuestion.type === 'select_all'}
          {#each currentQuestion.options as option, i}
            <label class="option-check">
              <input
                type="checkbox"
                value={i}
                on:change={handleSelectAll}
                checked={Array.isArray(userInput) && userInput.includes(i)}
                disabled={feedback && feedback.level === '🟢'}
              />
              <span>{option.text}</span>
            </label>
          {/each}
        {:else if currentQuestion.type === 'numerical'}
          <input
            type="number"
            bind:value={userInput}
            step="any"
            class:feedback-style={feedback}
          />
          <button on:click={submitAnswer}>Enviar</button>
        {:else if currentQuestion.type === 'fill_in_blank'}
          <input
            type="text"
            bind:value={userInput}
            class:feedback-style={feedback}
          />
          <button on:click={submitAnswer}>Enviar</button>
        {:else if currentQuestion.type === 'long_answer'}
          <textarea
            bind:value={userInput}
            class:feedback-style={feedback}
          ></textarea>
          <button on:click={submitAnswer}>Enviar</button>
        {/if}
      </div>

      <!-- FEEDBACK con borde y texto en rojo/verde, y truncado opcional -->
      {#if feedback}
        <div
          class="feedback"
          class:correct={feedback.level === '🟢'}
          class:incorrect={feedback.level === '🔴'}
          class:partial={feedback.level === '🟡'}
        >
          {#if feedback.message.length > 80 && !showFullFeedback}
            {feedback.message.slice(0, 80)}...
            <button class="toggle-feedback" on:click={toggleFullFeedback}>Ver más</button>
          {:else if feedback.message.length > 80 && showFullFeedback}
            {feedback.message}
            <button class="toggle-feedback" on:click={toggleFullFeedback}>Ver menos</button>
          {:else}
            {feedback.message}
          {/if}
        </div>
      {/if}
    </div>

    <!-- NAV: Anterior / Siguiente -->
    <nav>
      <button on:click={goToPrevious} disabled={$currentQuestionIndex === 0}>Anterior</button>
      <button
        on:click={goToNext}
        disabled={!feedback && $userAnswers[$currentQuestionIndex] === null}
        class="next-button"
        class:autoAdvance={nextButtonAnimation}
      >
        Siguiente
        {#if nextButtonAnimation}
          <span class="progress-bar"></span>
        {/if}
      </button>
    </nav>

    <!-- Botón "Volver al inicio" con estilo -->
    <button class="home-button" on:click={() => { $quizData = null; onNavigateHome?.(); }}>
      Volver al inicio
    </button>
  {/if}

  <!-- Log interno -->
  <pre class="debug-log">
    {#each debugLogs as msg}
      {msg}
    {/each}
  </pre>
</section>

<style>
  .home-button {
    margin-top: 10px;
    width: 150px;
    height: 45px;
    background: #AA2C86;
    border: 2px solid #AA2C86;
    border-radius: 6px;
    font-size: 16px;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .home-button:hover {
    background: #681650;
    border-color: #681650;
  }

  /* Puntaje */
  .score-box {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 5px 10px;
    border-radius: 6px;
  }
  .score-box .diamond {
    color: #00ffff;
    font-size: 1.1em;
  }
  .question-points {
    color: #fff;
    font-weight: bold;
  }

  /* Botones de opción con borde */
  .option-button {
    margin: 8px 0;
  }
  .option-button.correct {
    border: 2px solid #00ff00;
    color: #00ff00;
  }
  .option-button.incorrect {
    border: 2px solid #ff005a;
    color: #ff005a;
  }

  /* Checkbox */
  .option-check {
    display: flex;
    align-items: center;
    margin: 8px 0;
  }
  .option-check input[type="checkbox"] {
    margin-right: 10px;
    width: 18px;
    height: 18px;
  }

  /* Para inputs con feedback (numeric, fill_in_blank, etc.) */
  .feedback-style.correct {
    border: 2px solid #00ff00;
    color: #00ff00;
  }
  .feedback-style.incorrect {
    border: 2px solid #ff005a;
    color: #ff005a;
  }
  /* Asignación condicional */
  .feedback-style:global(.correct) {}
  .feedback-style:global(.incorrect) {}

  /* Feedback container */
  .feedback {
    margin: 10px 0;
    padding: 10px;
    border-radius: 5px;
    font-size: 0.95em;
    transition: all 0.3s ease;
    border: 2px solid;
  }
  .feedback.correct {
    border-color: #00ff00;
    color: #00ff00;
  }
  .feedback.incorrect {
    border-color: #ff005a;
    color: #ff005a;
  }
  .feedback.partial {
    border-color: #ffff00;
    color: #ffff00;
  }
  .toggle-feedback {
    margin-left: 10px;
    font-size: 0.8em;
    background: transparent;
    border: 1px solid #fff;
    color: #fff;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
  }

  /* Animación del auto-advance en el botón Siguiente */
  .next-button {
    position: relative;
    overflow: hidden;
  }
  .next-button.auto-advance .progress-bar {
    animation: fillBar 2s linear forwards;
  }
  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: #00ff00;
    width: 0;
  }
  @keyframes fillBar {
    0% { width: 0; }
    100% { width: 100%; }
  }

  /* Debug log */
  .debug-log {
    margin-top: 1rem;
    background: rgba(255,255,255,0.1);
    padding: 1rem;
    font-size: 0.85rem;
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid rgba(255,255,255,0.2);
  }
</style>
