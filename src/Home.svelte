<script>
  export let onNavigateQuiz; // Callback prop
  import { onMount } from "svelte";
  let active = false;

  onMount(() => {
    active = true;
  });

  function handleStartQuiz() {
    console.log("Start Quiz clicked, calling onNavigateQuiz");
    onNavigateQuiz?.();
  }
</script>

<section class="home" class:active>
  <h1>Quiz Game</h1>
  <p>
    Welcome to the Quiz Game! Test your knowledge with a variety of questions.
  </p>
  <button on:click={handleStartQuiz}>Start Quiz</button>
</section>
