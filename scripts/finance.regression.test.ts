import axios from "axios";

const API = "https://partner-api.euontour.com";

const agencyToken = process.env.AGENCY_TOKEN!;
const adminToken = process.env.ADMIN_TOKEN!;
const superAdminToken = process.env.SUPER_ADMIN_TOKEN!;

async function api(method: string, url: string, token: string, data?: any) {
    return axios({
        method,
        url: `${API}${url}`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
        data,
    });
}

async function run() {
    console.log("🔍 FINANCE REGRESSION TEST START");

    try {
        // 1. Verify Tokens
        if (!agencyToken || !adminToken || !superAdminToken) {
            throw new Error("Missing Tokens. Please set AGENCY_TOKEN, ADMIN_TOKEN, SUPER_ADMIN_TOKEN.");
        }

        // 1️⃣ Get initial wallet balance
        console.log("1️⃣ Checking Initial Balance...");
        const walletBefore = await api("GET", "/api/agency/wallet", agencyToken);
        const initialBalance = parseFloat(walletBefore.data.balance);
        console.log(`   Initial Balance: €${initialBalance}`);

        // 2️⃣ Submit deposit
        console.log("2️⃣ Submitting Deposit...");
        const deposit = await api(
            "POST",
            "/api/deposits/submit",
            agencyToken,
            {
                amount: 1000,
                bank_reference: "TEST-REF-001",
                proof_url: "https://example.com/proof.png" // This will use our Mock or Blob logic if integrated? User provided this URL.
            }
        );

        const depositId = deposit.data.id;
        console.log(`   Deposit Submitted: ${depositId}`);

        // 3️⃣ Admin verifies deposit
        console.log("3️⃣ Admin Verifying...");
        await api(
            "PUT",
            `/api/admin/deposits/${depositId}/verify`,
            adminToken
        );
        console.log("   Deposit Verified.");

        // 4️⃣ Wallet must still be unchanged
        console.log("4️⃣ Verifying Wallet Unchanged...");
        const walletMid = await api("GET", "/api/agency/wallet", agencyToken);
        if (parseFloat(walletMid.data.balance) !== initialBalance) {
            throw new Error(`❌ Wallet changed before super admin approval! Expected ${initialBalance}, got ${walletMid.data.balance}`);
        }
        console.log("   Balance OK (Unchanged).");

        // 5️⃣ Super Admin approves
        console.log("5️⃣ Super Admin Approving...");
        await api(
            "PUT",
            `/api/super/deposits/${depositId}/approve`,
            superAdminToken
        );
        console.log("   Deposit Approved.");

        // 6️⃣ Wallet must increase exactly
        console.log("6️⃣ Verifying Wallet Credit...");
        const walletAfter = await api("GET", "/api/agency/wallet", agencyToken);
        const expectedBalance = initialBalance + 1000;
        if (parseFloat(walletAfter.data.balance) !== expectedBalance) {
            throw new Error(`❌ Wallet credit mismatch! Expected ${expectedBalance}, got ${walletAfter.data.balance}`);
        }
        console.log(`   Balance OK: €${walletAfter.data.balance}`);

        // 7️⃣ Double approval must fail
        console.log("7️⃣ Testing Double Approval Protection...");
        try {
            await api(
                "PUT",
                `/api/super/deposits/${depositId}/approve`,
                superAdminToken
            );
            throw new Error("❌ Double approval allowed (Should have failed)");
        } catch (err: any) {
            if (err.message.includes("Double approval allowed")) throw err;
            console.log("✅ Double approval correctly blocked (400/500 caught)");
        }

        console.log("✅ FINANCE REGRESSION TEST PASSED");
    } catch (error: any) {
        console.error("\n❌ TEST FAILED");
        if (axios.isAxiosError(error)) {
            console.error(`API Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

run();
