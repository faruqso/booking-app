import * as React from "react";

interface StaffInvitationEmailProps {
  staffName: string;
  businessName: string;
  invitationUrl: string;
  primaryColor?: string;
  logoUrl?: string | null;
}

export function StaffInvitationEmail({
  staffName,
  businessName,
  invitationUrl,
  primaryColor = "#3b82f6",
  logoUrl,
}: StaffInvitationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {logoUrl && (
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img
            src={logoUrl}
            alt={businessName}
            style={{ maxHeight: "60px", maxWidth: "200px" }}
          />
        </div>
      )}
      
      <h2 style={{ color: "#333", marginBottom: "20px" }}>
        You&apos;ve been invited to join {businessName}
      </h2>
      
      <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "16px" }}>
        Hello {staffName},
      </p>
      
      <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "16px" }}>
        You&apos;ve been invited to join <strong>{businessName}</strong> as a staff member. 
        You&apos;ll be able to help manage bookings, view schedules, and assist with customer service.
      </p>
      
      <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "30px" }}>
        Click the button below to set up your account and create your password:
      </p>
      
      <div style={{ textAlign: "center", margin: "30px 0" }}>
        <a
          href={invitationUrl}
          style={{
            backgroundColor: primaryColor,
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontWeight: "600",
          }}
        >
          Accept Invitation & Set Password
        </a>
      </div>
      
      <p style={{ color: "#666", fontSize: "14px", marginTop: "30px" }}>
        Or copy and paste this link into your browser:
      </p>
      <p style={{ color: "#999", fontSize: "12px", wordBreak: "break-all", marginBottom: "20px" }}>
        {invitationUrl}
      </p>
      
      <p style={{ color: "#999", fontSize: "14px", marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        This invitation link will expire in 7 days. If you didn&apos;t expect this invitation, you can safely ignore this email.
      </p>
    </div>
  );
}
