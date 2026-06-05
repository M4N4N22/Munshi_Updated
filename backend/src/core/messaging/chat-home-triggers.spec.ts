import {
  isChatHomeTrigger,
  isGreetingMessage,
} from './chat-home-triggers';

describe('isGreetingMessage', () => {
  it('matches common hellos', () => {
    expect(isGreetingMessage('hello')).toBe(true);
    expect(isGreetingMessage('Hey!')).toBe(true);
    expect(isGreetingMessage('good morning')).toBe(true);
    expect(isGreetingMessage('Namaste ji')).toBe(true);
    expect(isGreetingMessage('namaste')).toBe(true);
    expect(isGreetingMessage('namasye')).toBe(true);
    expect(isGreetingMessage('namaste 🙏')).toBe(true);
    expect(isGreetingMessage('नमस्ते')).toBe(true);
  });

  it('does not match work instructions', () => {
    expect(isGreetingMessage('aaj 4 website banegi')).toBe(false);
    expect(isGreetingMessage('present')).toBe(false);
  });
});

describe('isChatHomeTrigger', () => {
  it('includes START and greetings', () => {
    expect(isChatHomeTrigger('START')).toBe(true);
    expect(isChatHomeTrigger('hi')).toBe(true);
    expect(isChatHomeTrigger('namaste')).toBe(true);
    expect(isChatHomeTrigger('Home par jayein')).toBe(true);
  });
});
