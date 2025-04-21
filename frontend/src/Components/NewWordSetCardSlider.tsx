import { useNavigate } from "react-router";
import { WordSetCardType } from "../Types/types";
import Slider from "./Slider";
import WordSetCardComponent from "./WordSetCardComponent";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { z } from "zod";
import { HomePageWordSet_ZOD } from "../Types/zod_response";
import { use } from "react";

const newWordSetPromise = getRequest(
  `${PATH}/getNewWordSet`,
  z.object({
    newWordSet: z.array(HomePageWordSet_ZOD),
  }),
);

export default function NewWordSetCardSlider() {
  const navigate = useNavigate();
  const data = use(newWordSetPromise);
  const newWordSet: WordSetCardType[] = data.newWordSet;
  return (
    <Slider
      data={newWordSet}
      renderData={(card: WordSetCardType) => (
        <WordSetCardComponent
          key={card.id}
          card={card}
          style={{
            width: `${100 / newWordSet.length}%`,
          }}
          onClick={() => navigate(`/wordSet/${card.id}`)}
        />
      )}
    />
  );
}
