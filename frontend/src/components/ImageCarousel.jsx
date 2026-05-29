import { useEffect, useState } from 'react';
import './ImageCarousel.css';

export default function ImageCarousel({ images = [], alt = 'Imagen de la rifa', className = '' }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [safeImages.join('|')]);

  if (!safeImages.length) {
    return (
      <div className={`raffle-carousel empty ${className}`.trim()}>
        <div className="carousel-empty">🎁</div>
      </div>
    );
  }

  const currentIndex = index % safeImages.length;
  const currentImage = safeImages[currentIndex];
  const hasMultiple = safeImages.length > 1;

  const prev = () => setIndex((value) => (value - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((value) => (value + 1) % safeImages.length);

  return (
    <div className={`raffle-carousel ${className}`.trim()}>
      <div className="carousel-stage">
        <img className="carousel-image" src={currentImage} alt={`${alt} ${currentIndex + 1}`} />

        {hasMultiple && (
          <>
            <button type="button" className="carousel-nav carousel-prev" onClick={(event) => { event.preventDefault(); event.stopPropagation(); prev(); }} aria-label="Imagen anterior">‹</button>
            <button type="button" className="carousel-nav carousel-next" onClick={(event) => { event.preventDefault(); event.stopPropagation(); next(); }} aria-label="Siguiente imagen">›</button>
            <div className="carousel-counter">{currentIndex + 1}/{safeImages.length}</div>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="carousel-thumbs" role="tablist" aria-label="Miniaturas de la rifa">
          {safeImages.map((image, thumbIndex) => (
            <button
              key={`${image}-${thumbIndex}`}
              type="button"
              className={`carousel-thumb ${thumbIndex === currentIndex ? 'active' : ''}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIndex(thumbIndex);
              }}
              aria-label={`Ver imagen ${thumbIndex + 1}`}
            >
              <img src={image} alt={`${alt} miniatura ${thumbIndex + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}