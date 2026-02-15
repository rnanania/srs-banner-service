const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("node:crypto");

const s3Client = new S3Client({});

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const parseEventInput = (event) => {
  if (!event) return {};
  if (event.body) {
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }
  return event;
};

const getUploadUrl = async (event) => {
  const bucketName = process.env.BANNER_BUCKET_NAME;
  if (!bucketName) {
    return jsonResponse(500, {
      message: "Missing BANNER_BUCKET_NAME environment variable",
    });
  }

  const input = parseEventInput(event);
  const fileName = input?.fileName;
  const fileType = input?.fileType;

  if (!fileName || !fileType) {
    return jsonResponse(400, {
      message: "fileName and fileType are required",
    });
  }

  const key = `banners/${randomUUID()}-${fileName}`;
  const expiresIn = Number(input?.expiresIn) > 0 ? Number(input.expiresIn) : 300;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return jsonResponse(200, {
      uploadUrl,
      key,
      bucket: bucketName,
      expiresIn,
    });
  } catch (error) {
    console.error("Failed to create presigned upload URL:", error);
    return jsonResponse(500, {
      message: "Failed to create upload URL",
    });
  }
};

module.exports = {
  getUploadUrl,
  handler: getUploadUrl,
};

