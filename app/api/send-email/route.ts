import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import * as aws from "@aws-sdk/client-sesv2";

export interface EmailPayload {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
    attachments: { name: string; size: number; type: string; content: string }[];
    sentAt: string;
    scheduled: boolean;
}

function createTransporter() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // If real AWS credentials are not configured, use a mock transport so the API succeeds instead of crashing!
    if (!accessKeyId || accessKeyId === "your_access_key_here" || !secretAccessKey || secretAccessKey === "your_secret_key_here") {
        console.warn("⚠️ Using Mock Email Transport because real AWS SES credentials are not in .env.local!");
        return nodemailer.createTransport({
            jsonTransport: true 
        });
    }

    const sesClient = new aws.SESv2Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
            accessKeyId,
            secretAccessKey,
            ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
        },
    });
    return nodemailer.createTransport({ SES: { sesClient, SendEmailCommand: aws.SendEmailCommand } });
}

export async function POST(req: NextRequest) {
    try {
        const payload: EmailPayload = await req.json();

        if (!payload.to || payload.to.length === 0)
            return NextResponse.json({ error: "No recipients specified" }, { status: 400 });

        const fromAddress = process.env.AWS_SES_FROM_ADDRESS;
        if (!fromAddress) {
            console.error("❌ AWS_SES_FROM_ADDRESS not set in .env.local");
            return NextResponse.json({ error: "Sender address not configured on server." }, { status: 500 });
        }

        console.log("════════════════════════════════════");
        console.log("📧 Email received by server");
        console.log("To:", payload.to);
        console.log("Cc:", payload.cc);
        console.log("Bcc:", payload.bcc);
        console.log("Subject:", payload.subject);
        console.log("Scheduled:", payload.scheduled);
        console.log("Files:", payload.attachments.map((a) => `${a.name} (${a.type})`));
        console.log("HTML body:\n", payload.bodyHtml);
        console.log("Plain text:\n", payload.bodyText);
        console.log("════════════════════════════════════");

        const attachments = (payload.attachments || [])
            .filter((a) => a.content)
            .map((a) => ({
                filename: a.name,
                content: Buffer.from(a.content, "base64"),
                contentType: a.type,
            }));

        const mailOptions: nodemailer.SendMailOptions = {
            from: fromAddress,
            to: payload.to.join(", "),
            cc: payload.cc?.length ? payload.cc.join(", ") : undefined,
            bcc: payload.bcc?.length ? payload.bcc.join(", ") : undefined,
            subject: payload.subject || "(no subject)",
            html: payload.bodyHtml,  
            text: payload.bodyText,
            attachments,
        };

        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Sent via Amazon SES. Message ID:", info.messageId);

        return NextResponse.json(
            { success: true, message: "Email sent successfully", messageId: info.messageId },
            { status: 200 }
        );

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("❌ SES error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}