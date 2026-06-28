import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    // Pinning a time zone keeps date formatting identical on server and client.
    timeZone: "Africa/Cairo",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
