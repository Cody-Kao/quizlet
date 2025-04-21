import { soundArray } from "../Consts/consts";

// date convert(Unix time to formatted yyyy/mm/dd)
export const formatTime = (unixTime: number): string => {
  const date = new Date(unixTime * 1000); // Convert seconds to milliseconds
  return date
    .toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "/"); // Ensure format is "yyyy/mm/dd"
};

export const formatTimeToSeconds = (unixTime: number): string => {
  const date = new Date(unixTime * 1000); // Convert seconds to milliseconds
  return date
    .toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\//g, "/"); // Ensure format is "yyyy/mm/dd"
};

// for generating random number in a range(pseudo random)
/* export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}; */
// crypto.getRandomValues() provides cryptographically strong randomness.
export const getRandomInt = (min: number, max: number): number => {
  if (min > max) throw new Error("Min should be less than or equal to Max");

  const range = max - min + 1;
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);

  // Convert to a random integer in range
  return min + (randomBuffer[0] % range);
};

// for sound
// Speaker function returning a Promise
// Speaker function that supports cancellation
export const AutoPlaySpeaker = (
  word: string,
  language: string,
  speechRef: React.RefObject<SpeechSynthesisUtterance | null>,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = language;

    // Store the speech instance in a ref
    speechRef.current = utterance;

    // Get available voices
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === language);
    if (voice) utterance.voice = voice;

    // Resolve when speech finishes
    utterance.onend = () => {
      speechRef.current = null;
      resolve();
    };

    // Reject promise if speech is manually stopped
    utterance.onpause = () => {
      speechRef.current = null;
      reject(new Error("Speech was paused"));
    };

    speechSynthesis.speak(utterance);
  });
};

export const Speaker = (word: string, language: string): void => {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = language;

  // Get available voices
  const voices = speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang === language);
  if (voice) utterance.voice = voice;

  speechSynthesis.speak(utterance);
};

export const textCount = (text: string): number => {
  return text.length;
};

export const isValidEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // Check if the password contains at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;

  // Check if the password contains at least one number
  if (!/\d/.test(password)) return false;

  return true;
};

export const isValidName = (name: string): boolean => {
  return /^[a-zA-Z0-9_]+$/.test(name);
};

export const isValidSound = (sound: string): boolean => {
  return soundArray.includes(sound);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]; // Create a copy to avoid mutating the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Random index from 0 to i
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
  }
  return shuffled;
};
