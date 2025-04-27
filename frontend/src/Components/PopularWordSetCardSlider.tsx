import { useNavigate } from "react-router";
import { WordSetCardType } from "../Types/types";
import CardSlider from "./CardSlider";
import WordSetCardComponent from "./WordSetCardComponent";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { z } from "zod";
import { PopularWordSetResponse } from "../Types/response";
import { HomePageWordSet_ZOD } from "../Types/zod_response";
import { use } from "react";

const popularWordSetPromise = getRequest<PopularWordSetResponse>(
  `${PATH}/getPopularWordSet`,
  z.object({
    popularWordSet: z.array(HomePageWordSet_ZOD),
  }),
);

export default function PopularWordSetCardSlider() {
  const navigate = useNavigate();
  const data = use(popularWordSetPromise);
  const popularWordSet: WordSetCardType[] = data.popularWordSet;

  return (
    <CardSlider<WordSetCardType>
      data={popularWordSet}
      renderData={(card: WordSetCardType) => (
        <WordSetCardComponent
          key={card.id}
          card={card}
          style={{
            width: `${100 / popularWordSet.length}%`,
          }}
          onClick={() => navigate(`/wordSet/${card.id}`)}
        />
      )}
    />
  );
}
