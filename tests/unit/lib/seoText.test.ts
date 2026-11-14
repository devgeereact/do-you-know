import { describe, expect, it } from 'vitest';
import { quizSeoDescription, quizSeoTitle } from '@/lib/seoText';

describe('quizSeoTitle', () => {
  it('adds "quiz" so the title matches what people search for', () => {
    expect(quizSeoTitle({ title: 'The Tudors' })).toBe('The Tudors quiz');
  });

  it('leaves titles that already say what they are', () => {
    expect(quizSeoTitle({ title: 'World History Challenge' })).toBe('World History Challenge');
    expect(quizSeoTitle({ title: 'Geography Masters' })).toBe('Geography Masters');
    expect(quizSeoTitle({ title: 'Space Quiz' })).toBe('Space Quiz');
  });

  it('prefers the SEO title written in the Studio', () => {
    expect(quizSeoTitle({ title: 'The Tudors', seo_title: 'Tudors quiz for KS3' })).toBe(
      'Tudors quiz for KS3',
    );
  });
});

describe('quizSeoDescription', () => {
  const quiz = { intro: 'Kings, queens and castles.', question_count: 20, age_min: 7, age_max: 11 };

  it('adds the size and ages to the intro, with no shared sales line', () => {
    expect(quizSeoDescription(quiz)).toBe(
      'Kings, queens and castles. 20 questions for ages 7 to 11.',
    );
  });

  it('handles open age ranges and missing facts', () => {
    expect(quizSeoDescription({ ...quiz, age_max: null })).toBe(
      'Kings, queens and castles. 20 questions for ages 7 and up.',
    );
    expect(quizSeoDescription({ intro: 'Just the intro.' })).toBe('Just the intro.');
  });

  it('prefers the SEO description and returns null when there is nothing to say', () => {
    expect(quizSeoDescription({ ...quiz, seo_description: 'Written by hand.' })).toBe(
      'Written by hand.',
    );
    expect(quizSeoDescription({})).toBeNull();
  });
});
