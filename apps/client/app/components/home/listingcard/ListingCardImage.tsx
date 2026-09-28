import type { ListingImage } from "./types";

import styles from "./ListingCard.module.css";

interface ListingCardImageProps {
  images: ListingImage[];
  alt: string;
}

export default function ListingCardImage({
  images,
  alt,
}: ListingCardImageProps) {
  const image = images[0];

  if (!image) {
    return (
      <div className={styles.imagePlaceholder}>
        <span>No image available</span>
      </div>
    );
  }

  return (
    <img
      className={styles.image}
      src={image.url}
      alt={alt}
      loading="lazy"
      draggable={false}
    />
  );
}