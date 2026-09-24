import { useState } from "react";
import { useNavigate } from "react-router";

interface UnitConfig {
  id: number;
  included: boolean;
  po: string;
  pso: string;
  subQuestionsCount: number;
  bloomsDistribution: { [key: string]: number };
}

export function PaperConfiguration() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [duration, setDuration] = useState(180);

  const [units, setUnits] = useState<UnitConfig[]>([
    { id: 1, included: true, po: "1", pso: "1", subQuestionsCount: 3, bloomsDistribution: { "BL1": 1, "BL2": 1 } },
    { id: 2, included: true, po: "1", pso: "1", subQuestionsCount: 3, bloomsDistribution: { "BL2": 2 } },
    { id: 3, included: true, po: "1", pso: "1", subQuestionsCount: 3, bloomsDistribution: { "BL3": 1, "BL4": 1 } },
    { id: 4, included: true, po: "1", pso: "1", subQuestionsCount: 3, bloomsDistribution: { "BL3": 2 } },
    { id: 5, included: true, po: "1", pso: "1", subQuestionsCount: 3, bloomsDistribution: { "BL4": 1, "BL5": 1 } },
  ]);

  const updateUnit = (id: number, field: keyof UnitConfig, value: any) => {
    setUnits(units.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const updateBloomsDistribution = (unitId: number, level: string, count: number) => {
    setUnits(units.map((u) => {
      if (u.id !== unitId) return u;
      const newDist = { ...u.bloomsDistribution };
      if (count > 0) {
        newDist[level] = count;
      } else {
        delete newDist[level];
      }
      return { ...u, bloomsDistribution: newDist };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create the required API payload format
    const apiPayload = {
      subject,
      totalMarks,
      duration,
      units: units.filter(u => u.included).map(u => ({
        unit: u.id,
        bloomsDistribution: u.bloomsDistribution,
        po: u.po,
        pso: u.pso,
        subQuestionsCount: u.subQuestionsCount
      }))
    };
    console.log("Submitting API Payload:", apiPayload);
    localStorage.setItem("paperConfig", JSON.stringify(apiPayload));
    
    navigate("/generate");
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Configure Paper</h1>
        <p className="text-muted-foreground">Set up your test parameters according to the 5 Units format</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Basic Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select Subject</option>
                <option value="ds">Data Structures</option>
                <option value="dbms">Database Systems</option>
                <option value="os">Operating Systems</option>
                <option value="cn">Computer Networks</option>
                <option value="ga">Generative AI and Prompt Engineering</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Total Marks
              </label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
                readOnly
              />
              <p className="text-xs text-muted-foreground mt-1">Fixed at 100 for this format (20 marks/unit)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Semester
              </label>
              <select className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>
          </div>
        </div>

        {/* Unit Builder */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Unit Configuration</h2>
            <p className="text-sm text-muted-foreground">Define parameters for each unit (2 full questions per unit, 20 marks each)</p>
          </div>

          <div className="space-y-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`p-4 border rounded-lg transition-colors ${unit.included ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"
                  }`}
              >
                <div className="flex items-center gap-3 mb-4 border-b border-border/50 pb-3">
                  <input
                    type="checkbox"
                    checked={unit.included}
                    onChange={(e) => updateUnit(unit.id, "included", e.target.checked)}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                  <h3 className="font-semibold text-foreground text-lg">Unit {unit.id}</h3>
                  {!unit.included && <span className="text-sm text-muted-foreground ml-auto">Excluded from paper</span>}
                </div>

                {unit.included && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2 md:col-span-4 bg-muted/20 p-4 rounded-lg border border-border/50">
                        <label className="block text-sm font-medium text-foreground mb-3">
                          Bloom's Level Distribution (Questions per Level)
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                          {["BL1", "BL2", "BL3", "BL4", "BL5", "BL6"].map(bl => (
                            <div key={bl} className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-muted-foreground">{bl}</label>
                              <input
                                type="number"
                                min="0"
                                value={unit.bloomsDistribution[bl] || 0}
                                onChange={(e) => updateBloomsDistribution(unit.id, bl, parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 bg-white border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Program Outcome (PO)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1, 2"
                          value={unit.po}
                          onChange={(e) => updateUnit(unit.id, "po", e.target.value)}
                          className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Prog. Spec. Outcome (PSO)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1"
                          value={unit.pso}
                          onChange={(e) => updateUnit(unit.id, "pso", e.target.value)}
                          className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Sub-questions
                        </label>
                        <select
                          value={unit.subQuestionsCount}
                          onChange={(e) => updateUnit(unit.id, "subQuestionsCount", parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="2">2 parts (e.g. 10+10)</option>
                          <option value="3">3 parts (e.g. 8+8+4)</option>
                          <option value="4">4 parts (e.g. 5+5+5+5)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Global Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Overall Difficulty</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Adjust the distribution of Bloom's Taxonomy Levels (BL) for the generated questions.</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">Easy (L1, L2)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="40"
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">Medium (L3, L4)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="40"
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">Hard (L5, L6)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="20"
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            Generate Question Paper
          </button>
        </div>
      </form>
    </div>
  );
}
