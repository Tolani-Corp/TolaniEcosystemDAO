import React from 'react';

const styles = {
    body: {
        backgroundColor: '#0f172a', // Slate-900 (Dark Mode Email)
        fontFamily: '"Montserrat", sans-serif',
        margin: 0,
        padding: 0,
        width: '100%',
        color: '#f8fafc',
    },
    container: {
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#1e293b', // Slate-800
        border: '1px solid #334155', // Slate-700
        marginTop: '20px',
    },
    header: {
        padding: '30px',
        textAlign: 'center' as const,
        borderBottom: '1px solid #334155',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    },
    logo: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#E5C64B', // TUT Gold
        display: 'inline-block',
        marginBottom: '10px',
    },
    brandName: {
        display: 'block',
        color: '#E5C64B', // TUT Gold
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase' as const,
    },
    content: {
        padding: '40px',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: 'rgba(0, 115, 115, 0.2)', // Teal transparent
        border: '1px solid #007373',
        color: '#2dd4bf', // Teal-400
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        marginBottom: '20px',
    },
    heading: {
        fontSize: '28px',
        lineHeight: '34px',
        color: '#ffffff',
        margin: '0 0 20px',
        fontWeight: 700,
    },
    metaTable: {
        width: '100%',
        borderTop: '1px solid #334155',
        borderBottom: '1px solid #334155',
        margin: '20px 0',
        padding: '20px 0',
    },
    metaLabel: {
        fontSize: '12px',
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        paddingBottom: '4px',
    },
    metaValue: {
        fontSize: '16px',
        color: '#f8fafc',
        fontWeight: 600,
    },
    description: {
        fontSize: '16px',
        lineHeight: '26px',
        color: '#cbd5e1', // Slate-200
        margin: '0 0 30px',
    },
    button: {
        display: 'block',
        width: '100%',
        backgroundColor: '#E5C64B', // TUT Gold
        color: '#0f172a', // Slate-900 Text
        textAlign: 'center' as const,
        textDecoration: 'none',
        padding: '16px 0',
        fontSize: '16px',
        fontWeight: 700,
        borderRadius: '4px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    footer: {
        padding: '30px',
        textAlign: 'center' as const,
        fontSize: '12px',
        color: '#64748b',
        backgroundColor: '#0f172a',
        borderTop: '1px solid #334155',
    }
};

export const GovernanceEmail = () => {
    return (
        <div style={styles.body as any}>
            <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: '100%', backgroundColor: '#0f172a' }}>
                <tr>
                    <td align="center">
                        <table role="presentation" cellPadding="0" cellSpacing="0" style={styles.container}>
                            {/* Header */}
                            <tr>
                                <td style={styles.header}>
                                    <div style={styles.logo}></div>
                                    <span style={styles.brandName}>Catalyst DAO</span>
                                </td>
                            </tr>

                            {/* Content */}
                            <tr>
                                <td style={styles.content}>
                                    <div style={styles.statusBadge}>Voting Active</div>
                                    <h1 style={styles.heading}>TIP-42: Allocate Treasury for Marketing</h1>

                                    <table style={styles.metaTable}>
                                        <tr>
                                            <td width="33%">
                                                <div style={styles.metaLabel}>Proposer</div>
                                                <div style={styles.metaValue}>Core Team</div>
                                            </td>
                                            <td width="33%">
                                                <div style={styles.metaLabel}>End Date</div>
                                                <div style={styles.metaValue}>Feb 14</div>
                                            </td>
                                            <td width="33%">
                                                <div style={styles.metaLabel}>Quorum</div>
                                                <div style={styles.metaValue}>12%</div>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style={styles.description}>
                                        This proposal seeks approval to allocate 50,000 TUT from the community treasury
                                        to fund the Phase 2 marketing campaign, focusing on user acquisition in the APAC region.
                                    </p>

                                    <a href="#" style={styles.button}>Cast Your Vote</a>
                                </td>
                            </tr>

                            {/* Footer */}
                            <tr>
                                <td style={styles.footer}>
                                    <p>You received this email because you hold TUT tokens.</p>
                                    <p>
                                        <a href="#" style={{ color: '#E5C64B', textDecoration: 'none' }}>Unsubscribe</a> • <a href="#" style={{ color: '#E5C64B', textDecoration: 'none' }}>Governance Forum</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
    );
};
