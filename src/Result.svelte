<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { score } from './stores.js';
  export let totalQuestions;
  const dispatch = createEventDispatcher();
  $: percentage = totalQuestions ? Math.round(($score / totalQuestions) * 100) : 0;
  let active = false;
  
  onMount(() => {
    active = true;
  });
</script>

<section class="result" class:active>
  <h2>Quiz Result</h2>
  <p>Your Score: {$score} out of {totalQuestions} ({percentage}%)</p>
  <div>
    <button on:click={() => dispatch('restartQuiz')}>Try Again</button>
    <button on:click={() => dispatch('goHome')}>Go Home</button>
  </div>
</section>

<style>
  .result {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    text-align: center;
    background: rgba(9, 0, 29, 0.9);
    border: 2px solid #AA2C86;
    border-radius: 10px;
  }
  .result.active {
    opacity: 1;
    transform: scale(1);
  }
  .result h2 {
    font-size: 2rem;
    margin-bottom: 10px;
  }
  .result p {
    font-size: 1.2rem;
    margin-bottom: 20px;
  }
  .result button {
    padding: 8px 16px;
    margin: 0 5px;
    background: #AA2C86;
    border: 2px solid #AA2C86;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition: background 0.3s;
  }
  .result button:hover {
    background: #681650;
  }
</style>
