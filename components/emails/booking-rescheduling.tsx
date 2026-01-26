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
import { format } from "date-fns";

interface BookingReschedulingEmailProps {
  customerName: string;
  serviceName: string;
  oldStartTime: Date;
  newStartTime: Date;
  businessName: string;
  bookingId: string;
  primaryColor: string;
  logoUrl?: string | null;
}

export function BookingReschedulingEmail({
  customerName,
  serviceName,
  oldStartTime,
  newStartTime,
  businessName,
  bookingId,
  primaryColor,
  logoUrl,
}: BookingReschedulingEmailProps) {
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
          <Heading style={{ ...heading, color: primaryColor }}>
            Booking Rescheduled
          </Heading>
          <Text style={paragraph}>Hello {customerName},</Text>
          <Text style={paragraph}>
            Your booking with {businessName} has been rescheduled.
          </Text>

          <Section style={detailsSection}>
            <Text style={label}>Service:</Text>
            <Text style={value}>{serviceName}</Text>

            <Text style={label}>Previous Time:</Text>
            <Text style={value}>
              {format(oldStartTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </Text>

            <Text style={label}>New Time:</Text>
            <Text style={{ ...value, color: primaryColor, fontWeight: "bold" }}>
              {format(newStartTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </Text>

            <Text style={label}>Booking ID:</Text>
            <Text style={value}>{bookingId}</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions or need to make changes, please contact us.
          </Text>
          <Text style={footer}>Thank you for choosing {businessName}!</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const logoSection = {
  padding: "20px 0",
  textAlign: "center" as const,
};

const logoStyle = {
  margin: "0 auto",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
  margin: "16px 0",
  textAlign: "center" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#484848",
  margin: "16px 0",
};

const detailsSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const label = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#6b7280",
  margin: "8px 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const value = {
  fontSize: "16px",
  color: "#111827",
  margin: "0 0 16px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#6b7280",
  margin: "8px 0",
  textAlign: "center" as const,
};
