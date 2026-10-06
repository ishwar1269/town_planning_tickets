// ==============================================================================
// WHITE-LABEL ENTERPRISE ORGANIZATION CONFIGURATION
// Customize branding, organization name, logo, primary colors, and support info.
// This allows deploying this helpdesk software for ANY enterprise or client.
// ==============================================================================

const defaultOrgConfig = {
  // Organization Details
  orgName: "Town Planning & Urban Development",
  orgShortName: "Town Planning",
  appTitle: "I-SupportOne Desk",
  appSubtitle: "Raise It. Route It. Resolve It.",
  portalCode: "TP-DESK",

  // Branding & Visuals
  logoIcon: "fa-solid fa-headset", // FontAwesome icon class or image URL
  logoColor: "#0265DC",
  primaryColor: "#0265DC",
  headerBg: "#182538",

  // Contact & Support Info
  supportEmail: "cgtownplan@gmail.com",
  supportPhone: "0866 - 2527 - 110",
  officeAddress: "Directorate of Town and Country Planning, Atal Nagar, Raipur (C.G.)",
  helpdeskDomain: "townplanning.cg.gov.in",

  // Footer & Versioning Info
  portalVersion: "v1.0.0",
  visitorCount: "1",
  emblemUrl: "",

  // Enterprise Feature Flags
  enableMultiTenant: true,
  enableSLAWarnings: true,
  enableEmailAlerts: true,

  // Custom Department Terms (e.g. Ticket / Complaint / Work Order / Case)
  ticketTermSingular: "Ticket",
  ticketTermPlural: "Tickets",
  categoryTerm: "Category"
};

// Load saved White-Label configuration from localStorage or fallback to defaults
export const getOrgConfig = () => {
  try {
    const saved = localStorage.getItem('org_white_label_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Reset old hardcoded 361849 visitor count
      if (!parsed.visitorCount || parsed.visitorCount === "361849" || parseInt(parsed.visitorCount, 10) > 10000) {
        parsed.visitorCount = "1";
      }
      // Migrate old Chhattisgarh Helpdesk to I-SupportOne Desk
      if (!parsed.appTitle || parsed.appTitle === "Chhattisgarh Helpdesk") {
        parsed.appTitle = "I-SupportOne Desk";
        parsed.appSubtitle = "Raise It. Route It. Resolve It.";
      }
      localStorage.setItem('org_white_label_config', JSON.stringify(parsed));
      return { ...defaultOrgConfig, ...parsed };
    }
  } catch (err) {
    console.error('Error loading org config:', err);
  }
  return defaultOrgConfig;
};

// Save updated White-Label configuration
export const saveOrgConfig = (newConfig) => {
  try {
    localStorage.setItem('org_white_label_config', JSON.stringify(newConfig));
    // Trigger custom event for real-time UI re-renders
    window.dispatchEvent(new Event('org_config_updated'));
  } catch (err) {
    console.error('Error saving org config:', err);
  }
};

export default defaultOrgConfig;
