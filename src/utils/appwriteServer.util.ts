import sdk from "node-appwrite";

// SDK for server side (api)
const client = new sdk.Client();

client
  .setEndpoint(process.env["APPWRITE_HOST"] as string)
  .setProject("pingvin-share")
  .setKey(process.env["APPWRITE_FUNCTION_API_KEY"] as string);

const awServer = {
  user: new sdk.Users(client),
  storage: new sdk.Storage(client),
  database: new sdk.Database(client),
};

export default awServer;
