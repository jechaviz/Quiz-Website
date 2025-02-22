import { writable } from 'svelte/store';

// Define and export each store individually
export const currentRoute = writable('home');
export const quizData = writable(null);
export const currentQuestionIndex = writable(0);
export const userAnswers = writable([]);
export const score = writable(0);