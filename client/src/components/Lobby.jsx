import { useState } from 'react';

const Lobby = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Створення кімнати: Генеруємо і заходимо миттєво
  const handleCreate = () => {
    if (!username.trim()) {
      alert("Please enter Hacker Alias first");
      return;
    }
    const newRoomId = 'NEKO-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    onJoin({ username, roomId: newRoomId, isOwner: true });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (username && roomId) {
      onJoin({ username, roomId, isOwner: false });
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono text-white p-4">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-8 shadow-2xl relative">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-light tracking-tighter uppercase border-b border-zinc-800 pb-2">
            Neko_<span className="font-bold">Breakers</span>
          </h1>
          <p className="text-[10px] text-zinc-500 mt-2 tracking-[0.2em] uppercase">
            {showJoinInput ? 'Intercepting Session...' : 'Establish Connection'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Alias - завжди зверху */}
          <div className="group">
            <label className="block text-[10px] uppercase text-zinc-500 mb-1 ml-1 tracking-widest">
                Hacker Alias
            </label>
            <input
              type="text"
              className="w-full bg-black border border-zinc-800 p-3 text-white rounded-none focus:outline-none focus:border-white transition-all"
              placeholder="root@cat"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {!showJoinInput ? (
            /* Гілка вибору */
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={handleCreate}
                className="w-full bg-white text-black font-bold py-4 uppercase text-sm tracking-[0.3em] hover:bg-zinc-200 transition-all"
              >
                Create New Lair
              </button>
              
              <button
                onClick={() => setShowJoinInput(true)}
                className="w-full border border-zinc-800 py-4 uppercase text-[10px] tracking-[0.3em] text-zinc-400 hover:text-white hover:border-white transition-all"
              >
                Join Existing
              </button>
            </div>
          ) : (
            /* Гілка приєднання */
            <form onSubmit={handleJoinSubmit} className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="group">
                <label className="block text-[10px] uppercase text-zinc-500 mb-1 ml-1 tracking-widest text-white">
                  Enter Access Code
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  className="w-full bg-black border border-white p-3 text-white rounded-none focus:outline-none"
                  placeholder="NEKO-XXXX"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-2 bg-white text-black font-bold py-3 px-6 uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all"
                >
                  Authorize
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinInput(false)}
                  className="flex-1 border border-zinc-800 text-zinc-500 py-3 uppercase text-[10px] hover:text-white transition-all"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Status Line */}
        <div className="mt-12 flex items-center opacity-20">
            <div className="h-[1px] flex-1 bg-zinc-800"></div>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span className="text-[8px] mx-4 tracking-[0.4em]">NEKO_OS</span>
            <div className="h-[1px] flex-1 bg-zinc-800"></div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;