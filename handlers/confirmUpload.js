const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDbClient = new DynamoDBClient({});

const decodeS3Key = (key) => decodeURIComponent((key || "").replace(/\+/g, " "));

const getFileNameFromKey = (key) => {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
};

const confirmUpload = async (event) => {
  const tableName = process.env.BANNERS_TABLE_NAME;
  if (!tableName) {
    throw new Error("Missing BANNERS_TABLE_NAME environment variable");
  }

  const records = event?.Records || [];
  if (records.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "No records to process" }),
    };
  }

  for (const record of records) {
    const bucket = record?.s3?.bucket?.name;
    const rawKey = record?.s3?.object?.key;
    const objectKey = decodeS3Key(rawKey);

    if (!bucket || !objectKey) {
      continue;
    }

    const fileName = getFileNameFromKey(objectKey);
    const objectUrl = `https://${bucket}.s3.amazonaws.com/${objectKey}`;

    await dynamoDbClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          fileName: { S: fileName },
          objectKey: { S: objectKey },
          bucket: { S: bucket },
          objectUrl: { S: objectUrl },
          uploadedAt: { S: new Date().toISOString() },
        },
      })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Upload records stored successfully" }),
  };
};

module.exports = {
  confirmUpload,
  handler: confirmUpload,
};

