import { APIResponse } from "../Types/response";
import { z } from "zod";

export const postRequest = async <T>(url: string, request: T): Promise<any> => {
  console.log("send post request", JSON.stringify(request));
  const isFormData = request instanceof FormData;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: isFormData
        ? {
            /* 空的，讓browser自己設定boundaries */
          }
        : {
            "Content-Type": "application/json",
          },
      body: isFormData ? request : JSON.stringify(request),
      credentials: "include",
    });
    if (!response.ok) {
      // response.ok is true for status codes 200-299
      throw {
        type: "Error",
        payload: { message: "連線問題! 請重試" },
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch (e) {
      // Invalid JSON
      throw {
        type: "Error",
        payload: { message: "回應格式錯誤，可能不是 JSON。" },
      };
    }
    const apiResponse = data as APIResponse;
    console.log("from post request", apiResponse);

    if (apiResponse.type === "Success") {
      return apiResponse;
    } else {
      throw apiResponse;
    }
  } catch (error) {
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
