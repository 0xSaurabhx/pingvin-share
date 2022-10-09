import { NextApiRequest, NextApiResponse } from "next";
import httpProxyMiddleware from "next-http-proxy-middleware";
import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// This function can be marked `async` if using `await` inside
export default (req: NextApiRequest, res: NextApiResponse) =>
  httpProxyMiddleware(req, res, {
    // You can use the `http-proxy` option
    target: publicRuntimeConfig.BACKEND_URL,
  });
