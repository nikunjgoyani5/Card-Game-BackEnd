import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success, fail } from "../../utils/apiResponse.utility";
import roomService from "./room.service";

export const createRoom = asyncHandler(async (req, res) => {
  const room = await roomService.createRoom(req?.user?._id, req.body);
  return success(res, "Room created successfully", { room });
});

export const joinRoom = asyncHandler(async (req, res) => {
  const result: any = await roomService.joinRoom(req?.user?._id, req.body);

  // Check if it's a matchmaking response or room response
  if (result?.status === "WAITING_FOR_PLAYERS") {
    return success(res, result?.message, result);
  }

  return success(res, "Room joined successfully", { room: result });
});

export const scheduleRoom = asyncHandler(async (req, res) => {
  const room = await roomService.scheduleRoom(req?.user?._id, req.body);
  return success(res, "Room scheduled successfully", { room });
});

export const listRooms = asyncHandler(async (req, res) => {
  const result = await roomService.listRooms(req.query, req?.user?._id);
  return success(res, "Rooms retrieved successfully", result);
});

export const getPublicRooms = asyncHandler(async (req, res) => {
  const result: any = await roomService.publicRooms(req.query, req?.user?._id);
  return success(res, "Rooms retrieved successfully", {
    rooms: result.rooms || result,
    total: result.total || result.length,
  });
});

export const getRoomById = asyncHandler(async (req, res) => {
  const room = await roomService.getRoom(req.params.id);
  return success(res, "Room retrieved successfully", { room });
});
