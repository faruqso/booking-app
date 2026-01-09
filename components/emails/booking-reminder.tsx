import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
} from "@react-email/components";

interface BookingReminderEmailProps {
  customerName: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  primaryColor: string;
  logoUrl?: string | null;
}

export function BookingReminderEmail({
  customerName,
  serviceName,
  startTime,
  businessName,
  primaryColor,
  logoUrl,
}: BookingReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img
                src={logoUrl}
                alt={businessName}
                width="120"
                height="auto"
                style={logoStyle}
              />
            </Section>
          )}
          <Heading style={{ ...heading, color: primaryColor }}>Booking Reminder</Heading>
          <Text style={paragraph}>Hello {customerName},</Text>
          <Text style={paragraph}>
            This is a reminder that you have a booking with <strong>{businessName}</strong>.
          </Text>
          <Section style={detailsBox}>
            <Text style={detailLabel}>Service:</Text>
            <Text style={detailValue}>{serviceName}</Text>
            <Text style={detailLabel}>Date & Time:</Text>
            <Text style={detailValue}>
              {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString()}
            </Text>
          </Section>
          <Text style={paragraph}>
            We look forward to seeing you!
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            {businessName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const heading = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0 20px",
  padding: "0 40px",
};

const paragraph = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
};

const detailsBox = {
  backgroundColor: "#f6f9fc",
  borderRadius: "4px",
  margin: "20px 40px",
  padding: "20px",
};

const detailLabel = {
  color: "#666",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase",
  marginTop: "12px",
  marginBottom: "4px",
};

const detailValue = {
  color: "#333",
  fontSize: "16px",
  marginBottom: "8px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 40px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
};

const logoSection = {
  textAlign: "center" as const,
  padding: "20px 40px",
};

const logoStyle = {
  maxWidth: "120px",
  height: "auto",
};

