import React, { useState } from 'react';
import { X, Search, UserCheck, Plus, Shield, MapPin, Phone, Building2 } from 'lucide-react';
import { WitnessPerson, WitnessRole } from '../types';
import { useSummons } from '../context/SummonContext';
import { useToast } from './Toast';

interface SelectPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (person: WitnessPerson) => void;
  title?: string;
  defaultRoleFilter?: WitnessRole | 'All';
}

export const SelectPersonModal: React.FC<SelectPersonModalProps> = ({
  isOpen,
  onClose,
  onSelectPerson,
  title = 'Select Registered Person or Witness',
  defaultRoleFilter = 'All',
}) => {
  const { witnesses, addWitness } = useSummons();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<WitnessRole | 'All'>(defaultRoleFilter);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New person form state
  const [newName, setNewName] = useState('');
  const [newFatherName, setNewFatherName] = useState('');
  const [newRole, setNewRole] = useState<WitnessRole>('Accused');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newStation, setNewStation] = useState('Central Precinct #4');
  const [newDistrict, setNewDistrict] = useState('New Delhi');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const filtered = witnesses.filter((w) => {
    if (roleFilter !== 'All' && w.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      (w.fatherName || '').toLowerCase().includes(q) ||
      (w.phone || '').includes(q) ||
      w.address.toLowerCase().includes(q) ||
      w.policeStation.toLowerCase().includes(q)
    );
  });

  const handleSaveNewPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Please enter the legal name', 'error');
      return;
    }
    if (!newAddress.trim()) {
      showToast('Please enter a delivery/residential address', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const created = await addWitness({
        name: newName.trim(),
        fatherName: newFatherName.trim() || undefined,
        role: newRole,
        phone: newPhone.trim() || undefined,
        address: newAddress.trim(),
        policeStation: newStation.trim() || 'Central Precinct',
        district: newDistrict.trim() || 'Delhi',
      });
      showToast(`${created.name} registered and selected`, 'success', 'Saved');
      onSelectPerson(created);
      onClose();
    } catch {
      showToast('Failed to register person. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#2F4A70] text-[#ADC8F5]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-xs text-[#8F9097]">
                Choose from stored records or quickly register a new person
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!isAddingNew ? (
            <>
              {/* Search Bar & Add Button */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8F9097] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, or address…"
                    className="w-full pl-10 pr-4 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white placeholder-[#606778] focus:border-[#ADC8F5] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-4 py-2 rounded-xl bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Someone
                </button>
              </div>

              {/* Role filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {(['All', 'Accused', 'Witness', 'Complainant', 'Surety'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      roleFilter === r
                        ? 'bg-[#FFB77D] text-[#2F1500] font-bold'
                        : 'bg-[#131B2E] text-[#8F9097] hover:text-white border border-[#222A3D]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* List of Persons */}
              {filtered.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-[#131B2E] border border-[#222A3D] rounded-xl">
                  <Shield className="w-8 h-8 text-[#8F9097] mx-auto opacity-50" />
                  <p className="text-xs text-[#8F9097]">
                    {witnesses.length === 0
                      ? 'No persons registered in directory yet.'
                      : 'No records matched your search filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="px-3.5 py-1.5 bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Register New Person Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectPerson(p);
                        onClose();
                      }}
                      className="p-3.5 bg-[#131B2E] border border-[#222A3D] hover:border-[#39475F] hover:bg-[#171F33] rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm group-hover:text-[#FFB77D] transition-colors">
                            {p.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#1E293B] text-[#ADC8F5] border border-[#39475F]">
                            {p.role}
                          </span>
                          {p.fatherName && (
                            <span className="text-xs text-[#8F9097]">s/o {p.fatherName}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#C5C6CD]">
                          <div className="flex items-center gap-1 truncate max-w-xs">
                            <MapPin className="w-3.5 h-3.5 text-[#FFB77D] shrink-0" />
                            <span className="truncate">{p.address}</span>
                          </div>
                          {p.phone && (
                            <div className="flex items-center gap-1 shrink-0 font-mono text-[#ADC8F5]">
                              <Phone className="w-3 h-3" />
                              <span>{p.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="p-2 rounded-lg bg-[#1E293B] text-[#ADC8F5] group-hover:bg-[#2F4A70] group-hover:text-white transition-colors shrink-0 ml-3"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Inline Quick Registration Form */
            <form onSubmit={handleSaveNewPerson} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#222A3D]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFB77D] font-mono">
                  Register Person to Police Directory
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-[#8F9097] hover:text-white underline cursor-pointer"
                >
                  Back to Select List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                    Father's / Spouse's Name
                  </label>
                  <input
                    type="text"
                    value={newFatherName}
                    onChange={(e) => setNewFatherName(e.target.value)}
                    placeholder="e.g. Late Shri O.P. Chandra"
                    className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                    Role in Proceedings *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as WitnessRole)}
                    className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none"
                  >
                    <option value="Accused">Accused Person</option>
                    <option value="Witness">Witness</option>
                    <option value="Complainant">Complainant / Victim</option>
                    <option value="Surety">Surety / Bail Guarantor</option>
                    <option value="Neighbor/Independent Witness">Neighbor / Spot Witness</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                  Complete Residential / Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="House / Flat No., Street, Colony, Village, Landmark, PIN Code"
                  className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                    Police Station
                  </label>
                  <input
                    type="text"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8F9097] block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131B2E] border border-[#222A3D] rounded-xl text-xs text-white focus:border-[#ADC8F5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 border border-[#222A3D] hover:bg-[#1E293B] text-xs font-medium text-[#DAE2FD] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Registering…' : 'Save & Select'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
