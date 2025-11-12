// 이 코드는 react-image-crop 공식 예제에서 가져온 Canvas를 이용한 이미지 추출 로직입니다.
export async function canvasPreview(image, canvas, crop) {
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // 크롭된 영역의 크기로 캔버스 크기 설정
  const pixelRatio = window.devicePixelRatio;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.scale(pixelRatio, pixelRatio);

  const cropX = crop.x;
  const cropY = crop.y;

  // 이미지 드로잉
  ctx.drawImage(
    image,
    cropX,
    cropY,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
}