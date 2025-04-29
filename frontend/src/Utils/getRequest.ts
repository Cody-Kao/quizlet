import { z } from "zod";
import { APIResponse } from "../Types/response";

export const getRequest = async <T>(
  url: string,
  schema: z.Schema<T>,
  signal?: AbortSignal,
): Promise<T> => {
  try {
    const response = await fetch(url, {
      signal,
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      // HTTP error (non-2xx)
      throw {
        type: "Error",
        payload: { message: "連線問題! 請重試" },
      };
    }
    // 正確做法就是不做type assertion給API date，而是接收到後再進行驗證
    let data: unknown;
    try {
      data = await response.json();
    } catch (e) {
      // Invalid JSON
      throw {
        type: "Error",
        payload: { message: `回應格式錯誤，可能不是 JSON。` },
      };
    }

    // Basic shape validation for data，看是否為APIResponse的格式
    if (
      typeof data !== "object" ||
      data === null ||
      !("type" in data) ||
      !("payload" in data)
    ) {
      throw {
        type: "Error",
        payload: { message: "回傳資料格式不正確" },
      };
    }

    // 驗證資料structure，使用zod
    const apiResponse = data as APIResponse;
    if (apiResponse.type === "Success") {
      try {
        const validatedPayload = schema.safeParse(apiResponse.payload);

        if (!validatedPayload.success) {
          throw {
            type: "Error",
            payload: {
              message: "資料驗證失敗",
            },
          };
        }
        return validatedPayload.data;
      } catch (validationError) {
        throw validationError;
      }
    } else {
      throw apiResponse;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw {
        type: "AbortError",
        payload: { message: "請求已中止" },
      };
    }
    // validate error structure
    const validatedError = z
      .object({
        type: z.string(),
        payload: z.object({ message: z.string() }),
      })
      .safeParse(error);
    if (validatedError.success) {
      // Re-throw known API error
      throw error as APIResponse;
    } else {
      throw {
        type: "Error",
        payload: { message: "請求發生錯誤" },
      };
    }
  }
};
