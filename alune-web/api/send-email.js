const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

export default async function handler(req, res) {
    if (req.method === "POST") {
        const { name, feedback, email, cfToken } = req.body;

        // Xác minh Turnstile với Cloudflare
        const turnstileResponse = await fetch(
            `https://challenges.cloudflare.com/turnstile/v0/siteverify`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    secret: process.env.CLOUDFLARE_SECRET_KEY, // Biến môi trường
                    response: cfToken,
                }),
            }
        );
        const turnstileData = await turnstileResponse.json();

        if (!turnstileData.success) {
            return res.status(400).json({ error: "CAPTCHA verification failed" });
        }

        // Gửi email với Nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER, // Biến môi trường
                pass: process.env.GMAIL_PASS, // Biến môi trường
            },
        });

        try {
            await transporter.sendMail({
                from: `"Feedback Form" <${process.env.GMAIL_USER}>`,
                to: process.env.GMAIL_USER,
                subject: "New Feedback Submission",
                text: `Name: ${name}\nFeedback: ${feedback}\nEmail: ${email}`,
            });

            res.status(200).json({ message: "Feedback sent successfully!" });
        } catch (error) {
            console.error("Error sending email:", error);
            res.status(500).json({ error: "Failed to send feedback" });
        }
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).end("Method Not Allowed");
    }
}
