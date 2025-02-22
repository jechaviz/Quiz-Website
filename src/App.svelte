<script>
  import Home from './Home.svelte';
  import Quiz from './Quiz.svelte';
  import Result from './Result.svelte';
  import { currentRoute, quizData } from './stores.js';

  function navigate(route) {
    $currentRoute = route;
  }
</script>

<main>
  {#if $currentRoute === 'home'}
    <Home onNavigateQuiz={() => navigate('quiz')} />
    {:else if $currentRoute === 'quiz'}
    <Quiz
            onNavigateResult={() => navigate('result')}
            onNavigateHome={() => navigate('home')}
    />
    {:else if $currentRoute === 'result'}
    <Result
            totalQuestions={$quizData?.questions.length || 0}
            onRestartQuiz={() => navigate('quiz')}
            onGoHome={() => navigate('home')}
    />
  {/if}
</main>

<style>
  @import './global.css';
</style>