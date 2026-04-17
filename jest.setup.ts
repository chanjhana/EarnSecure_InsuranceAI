import '@testing-library/jest-native/extend-expect';
import { cleanup } from '@testing-library/react-native';

beforeAll(() => {
	// Keep RAF behavior async for RN animations, but avoid Jest-specific time access in callbacks.
	global.requestAnimationFrame = ((callback: (time: number) => void) => {
		return setTimeout(() => callback(Date.now()), 0) as unknown as number;
	}) as typeof global.requestAnimationFrame;

	global.cancelAnimationFrame = ((id: number) => {
		clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
	}) as typeof global.cancelAnimationFrame;

	if (typeof global.window === 'object') {
		(global.window as { dispatchEvent?: (event: Event) => boolean }).dispatchEvent = () => true;
	}
});

afterEach(() => {
	cleanup();
	jest.clearAllMocks();
	jest.clearAllTimers();
});
