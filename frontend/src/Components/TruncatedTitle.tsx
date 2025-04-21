import { useState, useEffect } from "react";

export const TruncatedTitle = ({
  title,
  wordLimit,
}: {
  title: string;
  wordLimit: number;
}) => {
  const [limitedTitle, setLimitedTitle] = useState(title);

  useEffect(() => {
    if (title.length > wordLimit) {
      setLimitedTitle(title.slice(0, wordLimit) + "...");
    } else {
      setLimitedTitle(title);
    }
  }, [title, wordLimit]);

  return <span className="light-content block">{limitedTitle}</span>;
};
