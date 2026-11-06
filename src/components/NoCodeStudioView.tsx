import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Code, 
  Coins, 
  Smartphone, 
  Plus, 
  Trash2, 
  Check, 
  Play, 
  AlertCircle, 
  Scale, 
  ShieldCheck, 
  HelpCircle,
  Copy
} from 'lucide-react';
import { db } from '../db/db';
import { 
  CustomParserRule, 
  CustomAssetClass, 
  KhumsInclusionRule, 
  Account, 
  Currency 
} from '../types';
import { formatCurrency } from '../utils/formatters';
import { AndroidRoutinesSetupModal } from './AndroidRoutinesSetupModal';

interface NoCodeStudioViewProps {
  accounts: Account[];
  onRefreshData: () => void;
}

export const NoCodeStudioView: React.FC<NoCodeStudioViewProps> = ({
  accounts,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'PARSER_STUDIO' | 'KHUMS_ASSETS' | 'ROUTINES'>('PARSER_STUDIO');
  
  // Custom Parser Rules state
  const [parserRules, setParserRules] = useState<CustomParserRule[]>([]);
  const [testText, setTestText] = useState<string>(
    'Meezan Alert: Rs. 18,500.00 debited from A/C 0201-9872 to Al-Khidmat Foundation on 06-Nov-2026.'
  );
  const [ruleName, setRuleName] = useState<string>('Meezan Bank Transfer');
  const [sourceKeyword, setSourceKeyword] = useState<string>('Meezan');
  const [regexPattern, setRegexPattern] = useState<string>('(?:Rs\\.?|PKR)\\s*([0-9,]+(?:\\.[0-9]{2})?).*?to\\s+([^on]+)');
  const [defaultCategory, setDefaultCategory] = useState<string>('Donation');
  const [defaultAccountId, setDefaultAccountId] = useState<string>(accounts[0]?.id || 'al-habib-pkr');
  const [testOutput, setTestOutput] = useState<{ amount?: number; merchant?: string; currency?: string } | null>(null);

  // Custom Khums Assets state
  const [customAssets, setCustomAssets] = useState<CustomAssetClass[]>([]);
  const [assetName, setAssetName] = useState<string>('');
  const [assetCategory, setAssetCategory] = useState<'LIQUID' | 'FIXED' | 'COMMODITY' | 'RECEIVABLE'>('COMMODITY');
  const [assetValue, setAssetValue] = useState<number>(0);
  const [khumsRule, setKhumsRule] = useState<KhumsInclusionRule>('SAVINGS_100');
  const [assetNotes, setAssetNotes] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRoutinesModal, setShowRoutinesModal] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [rules, assets] = await Promise.all([
        db.custom_parser_rules.toArray(),
        db.custom_assets.toArray()
      ]);
      setParserRules(rules);
      setCustomAssets(assets);
    } catch (e) {
      console.warn('Failed to load studio data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Test Regex against input text
  const handleTestRegex = () => {
    try {
      const re = new RegExp(regexPattern, 'i');
      const match = testText.match(re);
      if (match) {
        const rawAmt = match[1]?.replace(/,/g, '');
        const merchant = match[2]?.trim() || 'Extracted Merchant';
        const parsedAmt = rawAmt ? parseFloat(rawAmt) : 0;
        setTestOutput({
          amount: parsedAmt,
          merchant,
          currency: testText.includes('AED') ? 'AED' : 'PKR'
        });
      } else {
        setTestOutput(null);
        alert('Pattern did not match sample text. Please adjust regex or keywords.');
      }
    } catch (err: any) {
      alert(`Regex syntax error: ${err.message}`);
    }
  };

  // Save new custom parser rule
  const handleSaveRule = async () => {
    if (!ruleName.trim() || !regexPattern.trim()) {
      alert('Please provide a rule name and regex pattern.');
      return;
    }

    const newRule: CustomParserRule = {
      id: `rule-custom-${Date.now()}`,
      ruleName: ruleName.trim(),
      sourceKeyword: sourceKeyword.trim().toLowerCase(),
      regexPattern: regexPattern.trim(),
      amountCaptureGroupIndex: 1,
      currencyCaptureGroupIndex: 0,
      merchantCaptureGroupIndex: 2,
      defaultCategory: defaultCategory.trim(),
      defaultAccountId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    await db.custom_parser_rules.add(newRule);
    showToast(`Saved rule "${newRule.ruleName}"! Future matching SMS will auto-parse.`);
    setRuleName('');
    await loadData();
  };

  const handleDeleteRule = async (id: string) => {
    await db.custom_parser_rules.delete(id);
    await loadData();
  };

  // Save Custom Asset Class
  const handleSaveAsset = async () => {
    if (!assetName.trim() || assetValue <= 0) {
      alert('Please provide asset name and a positive estimated value.');
      return;
    }

    const newAsset: CustomAssetClass = {
      id: `asset-${Date.now()}`,
      name: assetName.trim(),
      category: assetCategory,
      estimatedValuePKR: Number(assetValue),
      khumsInclusionRule: khumsRule,
      notes: assetNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    await db.custom_assets.add(newAsset);
    showToast(`Added custom Khums asset "${newAsset.name}"!`);
    setAssetName('');
    setAssetValue(0);
    setAssetNotes('');
    await loadData();
  };

  const handleDeleteAsset = async (id: string) => {
    await db.custom_assets.delete(id);
    await loadData();
  };

  // Compute total Khumsable value of custom assets
  const totalCustomKhumsPKR = customAssets.reduce((sum, a) => {
    let rate = 0;
    if (a.khumsInclusionRule === 'SAVINGS_100') rate = 0.20;
    else if (a.khumsInclusionRule === 'CONSUMABLE_20') rate = 0.20;
    else if (a.khumsInclusionRule === 'UNUSED_GOODS_25') rate = 0.25;
    return sum + (a.estimatedValuePKR * rate);
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">No-Code Extensibility Studio</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  10-Year Future-Proofing
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Define visual regex rules for new bank notifications without touching code, or register custom Khums asset classes (Gold, Property, Stocks, Kemati).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRoutinesModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition shrink-0"
          >
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <span>Android Routines Guide</span>
          </button>
        </div>

        {toastMessage && (
          <div className="mt-4 p-2.5 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('PARSER_STUDIO')}
          className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
            activeTab === 'PARSER_STUDIO'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="h-4 w-4" />
          <span>Custom Bank SMS / Receipt Rules ({parserRules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('KHUMS_ASSETS')}
          className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
            activeTab === 'KHUMS_ASSETS'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Custom Khums Asset Classes ({customAssets.length})</span>
        </button>
      </div>

      {/* Subtab 1: Custom Parser Studio */}
      {activeTab === 'PARSER_STUDIO' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Rule Builder & Regex Sandbox</span>
            </h4>

            {/* Test Sample Text Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Paste Sample Bank SMS / Notification:
              </label>
              <textarea
                rows={2}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="Paste notification text from any new bank..."
              />
            </div>

            {/* Rule Config Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Meezan Transfer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Keyword Match</label>
                <input
                  type="text"
                  value={sourceKeyword}
                  onChange={(e) => setSourceKeyword(e.target.value)}
                  placeholder="e.g. Meezan, DIB, CBD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Default Account</label>
                <select
                  value={defaultAccountId}
                  onChange={(e) => setDefaultAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Regex Extraction Pattern (Group 1: Amount, Group 2: Merchant)</label>
                <input
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Default Category</label>
                <input
                  type="text"
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  placeholder="e.g. Donation, Grocery, Bill Payment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Test Runner & Save */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestRegex}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                <Play className="h-3.5 w-3.5 text-indigo-400" />
                <span>Test Pattern Match</span>
              </button>

              <button
                type="button"
                onClick={handleSaveRule}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-950/50"
              >
                <Plus className="h-4 w-4" />
                <span>Save Rule to Engine</span>
              </button>
            </div>

            {/* Test Output Box */}
            {testOutput && (
              <div className="p-3 bg-slate-950 border border-indigo-900/60 rounded-xl text-xs font-mono text-slate-300 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500">Captured Amount:</span>
                  <div className="text-emerald-400 font-bold">{testOutput.amount?.toLocaleString()} {testOutput.currency}</div>
                </div>
                <div>
                  <span className="text-slate-500">Captured Merchant:</span>
                  <div className="text-indigo-300 font-bold">{testOutput.merchant}</div>
                </div>
                <div>
                  <span className="text-slate-500">Target Category:</span>
                  <div className="text-slate-200 font-bold">{defaultCategory}</div>
                </div>
              </div>
            )}
          </div>

          {/* Active Rules List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white">Active Custom Rules ({parserRules.length})</h4>
            {parserRules.length === 0 ? (
              <p className="text-xs text-slate-500">No custom parser rules defined yet. Use the builder above to add rules for new bank formats.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {parserRules.map(r => (
                  <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold flex items-center space-x-2">
                        <span>{r.ruleName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          keyword: {r.sourceKeyword}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 truncate max-w-md">
                        {r.regexPattern}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Maps to: <strong className="text-slate-300">{r.defaultCategory}</strong> via {accounts.find(a => a.id === r.defaultAccountId)?.name || r.defaultAccountId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Custom Khums Assets */}
      {activeTab === 'KHUMS_ASSETS' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Coins className="h-4 w-4 text-purple-400" />
              <span>Add Custom Khums Asset Class</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Gold Sovereigns, Property"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Asset Category</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="COMMODITY">Commodity (Gold / Silver)</option>
                  <option value="FIXED">Real Estate Property / Plot</option>
                  <option value="RECEIVABLE">Receivable / Committee (Kemati)</option>
                  <option value="LIQUID">Stocks / Crypto / Liquid</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Estimated Value (PKR)</label>
                <input
                  type="number"
                  value={assetValue || ''}
                  onChange={(e) => setAssetValue(Number(e.target.value))}
                  placeholder="e.g. 500000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Khums Inclusion Rule</label>
                <select
                  value={khumsRule}
                  onChange={(e) => setKhumsRule(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
                >
                  <option value="SAVINGS_100">100% Taxable Surplus (20% Due)</option>
                  <option value="CONSUMABLE_20">20% Consumables Reserve</option>
                  <option value="UNUSED_GOODS_25">25% Unused Items Rate</option>
                  <option value="EXEMPT">Exempt (Personal Residence / Car)</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-400 mb-1">Notes / Valuation Details</label>
              <input
                type="text"
                value={assetNotes}
                onChange={(e) => setAssetNotes(e.target.value)}
                placeholder="e.g. 2 Tola gold bought in 2024 at current market bullion rate"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveAsset}
                className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-950/50"
              >
                <Plus className="h-4 w-4" />
                <span>Register Asset Class</span>
              </button>
            </div>
          </div>

          {/* Asset Summary & Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white">Registered Custom Assets ({customAssets.length})</h4>
              <div className="text-xs text-purple-300 font-mono font-bold">
                Total Custom Khums Contribution: {formatCurrency(totalCustomKhumsPKR, 'PKR')}
              </div>
            </div>

            {customAssets.length === 0 ? (
              <p className="text-xs text-slate-500">No custom asset classes registered yet.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {customAssets.map(a => (
                  <div key={a.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold flex items-center space-x-2">
                        <span>{a.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          {a.category}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-300 mt-0.5">
                        Value: {formatCurrency(a.estimatedValuePKR, 'PKR')} • Rule: <strong className="text-purple-300">{a.khumsInclusionRule}</strong>
                      </div>
                      {a.notes && <div className="text-[10px] text-slate-500 mt-0.5">{a.notes}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(a.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Android Routines Setup Modal */}
      <AndroidRoutinesSetupModal
        isOpen={showRoutinesModal}
        onClose={() => setShowRoutinesModal(false)}
        onSimulateIngest={(text) => {
          showToast('Simulated notification ingested!');
        }}
      />

    </div>
  );
};
