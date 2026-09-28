import { describe, it, expect } from 'vitest';
import { MAX_AVATAR_SOURCE_BYTES, avatarFileError, previewImageStyle } from './avatarFile';

function fileOf(type: string, size: number): File {
  const file = new File(['x'], 'photo', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('avatarFileError', () => {
  it('accepts any image up to the limit', () => {
    expect(avatarFileError(fileOf('image/jpeg', 1000))).toBeNull();
    expect(avatarFileError(fileOf('image/png', MAX_AVATAR_SOURCE_BYTES))).toBeNull();
  });

  it('rejects files that are not images', () => {
    expect(avatarFileError(fileOf('application/pdf', 1000))).toMatch(/imagen/);
    expect(avatarFileError(fileOf('', 1000))).toMatch(/imagen/);
  });

  it('rejects images over 15 MB', () => {
    expect(avatarFileError(fileOf('image/jpeg', MAX_AVATAR_SOURCE_BYTES + 1))).toMatch(/15 MB/);
  });
});

describe('previewImageStyle', () => {
  it('scales the image so the cropped area fills the preview', () => {
    expect(previewImageStyle({ x: 10, y: 20, width: 50 })).toEqual({
      width: '200%',
      transform: 'translate(-10%, -20%)',
    });
  });

  it('shows the whole image when nothing is cropped', () => {
    expect(previewImageStyle({ x: 0, y: 0, width: 100 })).toEqual({
      width: '100%',
      transform: 'translate(-0%, -0%)',
    });
  });
});
